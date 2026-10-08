import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ExperimentPlan } from '../../generated/prisma/client.js';
import { isNull } from 'es-toolkit/predicate';
import { DatabaseService } from '../database/database.service.js';
import { DatabaseErrors } from '../database/database-errors.js';
import { ConfigurationImportDocument } from '../configurations/configuration-import-document.js';
import { SchemaCompiler } from '../validation/schema-compiler.js';
import { ExperimentPlanSchemas, type ExperimentPlanRequest } from './experiment-plan-types.js';
import { ExperimentPlanMessages } from './experiment-plan-messages.js';
const Validators = {
  identifier: SchemaCompiler.compile<string>(ExperimentPlanSchemas.Identifier),
  request: SchemaCompiler.compile<ExperimentPlanRequest>(ExperimentPlanSchemas.Request),
} as const;
@Injectable()
export class ExperimentPlanService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async read(identifier: unknown) {
    const version = await this.version(identifier);
    const configuration = ConfigurationImportDocument.validate(version.document);
    const weights = configuration.experiment.variants;
    const plan = await this.database.client.experimentPlan.findUnique({
      where: { versionIdentifier: version.identifier },
    });

    return { plan, expectedAllocationA: weights.A.weight / (weights.A.weight + weights.B.weight) };
  }

  async save(identifier: unknown, input: unknown, administratorIdentifier: string) {
    if (!Validators.request(input)) {
      throw new BadRequestException(ExperimentPlanMessages.Invalid);
    }

    const request = { ...input };
    const version = await this.version(identifier);
    const plannedEndAt = new Date(request.plannedEndAt);

    if (
      !Number.isFinite(plannedEndAt.getTime()) ||
      plannedEndAt.toISOString() !== request.plannedEndAt
    ) {
      throw new BadRequestException(ExperimentPlanMessages.EndDate);
    }

    const existing = await this.database.client.experimentPlan.findUnique({
      where: { versionIdentifier: version.identifier },
    });

    if (!isNull(existing)) {
      return this.replay(existing, request);
    }

    if (plannedEndAt.getTime() <= Date.now()) {
      throw new BadRequestException(ExperimentPlanMessages.EndDate);
    }

    try {
      return await this.database.client.experimentPlan.create({
        data: {
          ...request,
          plannedEndAt,
          versionIdentifier: version.identifier,
          administratorIdentifier,
        },
      });
    } catch (error) {
      if (!DatabaseErrors.isUniqueConstraint(error)) {
        throw error;
      }

      const concurrent = await this.database.client.experimentPlan.findUniqueOrThrow({
        where: { versionIdentifier: version.identifier },
      });

      return this.replay(concurrent, request);
    }
  }

  private replay(existing: ExperimentPlan, request: ExperimentPlanRequest): ExperimentPlan {
    if (
      existing.hypothesis !== request.hypothesis ||
      existing.primaryMetric !== request.primaryMetric ||
      existing.targetSamplePerVariant !== request.targetSamplePerVariant ||
      existing.conversionWindowHours !== request.conversionWindowHours ||
      existing.plannedEndAt.toISOString() !== request.plannedEndAt
    ) {
      throw new ConflictException(ExperimentPlanMessages.Locked);
    }

    return existing;
  }

  private async version(identifier: unknown) {
    if (!Validators.identifier(identifier)) {
      throw new BadRequestException(ExperimentPlanMessages.Invalid);
    }

    const version = await this.database.client.funnelVersion.findUnique({ where: { identifier } });

    if (isNull(version)) {
      throw new NotFoundException(ExperimentPlanMessages.Missing);
    }

    return version;
  }
}
