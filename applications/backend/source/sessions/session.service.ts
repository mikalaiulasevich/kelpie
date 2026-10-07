import { createHash, randomInt } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  ExperimentVariant,
  FunnelConfigurations,
  type FunnelConfiguration,
} from '@kelpie/contracts';
import { FunnelEvaluation } from '@kelpie/funnel-runtime';
import { isNull } from 'es-toolkit/predicate';
import { sortBy } from 'es-toolkit/array';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Prisma } from '../../generated/prisma/client.js';
import { DatabaseService } from '../database/database.service.js';
import { PublicRequestError } from '../transport/public-request-error.js';
import { SessionEvents } from '../events/session-events.js';
import { SessionOwnershipService } from './session-ownership.service.js';
import { SessionProjection } from './session-projection.js';
import { SessionSnapshots } from './session-snapshots.js';
import { SessionInputs } from './session-inputs.js';
import { SessionPolicy, SessionErrorCode } from './session-policy.js';
import { SessionMessages } from './session-messages.js';
import type {
  CreateSessionRequest,
  SessionQuery,
  SessionState,
  CurrentSessionResponse,
  OwnedSession,
} from './session-types.js';

const SessionCreation = {
  fingerprint(body: CreateSessionRequest, query: SessionQuery): string {
    return createHash(SessionPolicy.HashAlgorithm)
      .update(
        JSON.stringify([
          'create',
          body.funnelIdentifier,
          body.clientTimestamp,
          sortBy(Object.entries(query), [([key]) => key]),
        ]),
      )
      .digest(SessionPolicy.HashEncoding);
  },

  assignment(configuration: FunnelConfiguration, query: SessionQuery) {
    const override = query[configuration.experiment.overrideQueryParam];
    if (override === ExperimentVariant.A || override === ExperimentVariant.B) {
      return { variant: override, source: SessionPolicy.Assignment.Forced };
    }
    const variants = configuration.experiment.variants;
    const threshold = variants.A.weight / (variants.A.weight + variants.B.weight);
    const variant =
      randomInt(SessionPolicy.RandomResolution) / SessionPolicy.RandomResolution < threshold
        ? ExperimentVariant.A
        : ExperimentVariant.B;

    return { variant, source: SessionPolicy.Assignment.Random };
  },

  async replay(
    transaction: Prisma.TransactionClient,
    session: OwnedSession,
    body: CreateSessionRequest,
    fingerprint: string,
  ): Promise<SessionState> {
    if (session.expiresAt.getTime() <= Date.now()) {
      throw new PublicRequestError(
        HttpStatus.UNAUTHORIZED,
        SessionErrorCode.Unauthorized,
        SessionMessages.Unauthorized,
      );
    }
    const previous = await transaction.sessionOperation.findUnique({
      where: {
        sessionIdentifier_operationIdentifier: {
          sessionIdentifier: session.identifier,
          operationIdentifier: body.operationIdentifier,
        },
      },
    });
    if (isNull(previous)) {
      throw new PublicRequestError(
        HttpStatus.CONFLICT,
        SessionErrorCode.Bound,
        SessionMessages.Bound,
      );
    }
    if (previous.requestFingerprint !== fingerprint) {
      throw new PublicRequestError(
        HttpStatus.CONFLICT,
        SessionErrorCode.Conflict,
        SessionMessages.Conflict,
      );
    }

    return SessionSnapshots.read(previous.response);
  },
} as const;

@Injectable()
export class SessionService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(SessionOwnershipService) private readonly ownership: SessionOwnershipService,
  ) {}

  async current(request: FastifyRequest, reply: FastifyReply): Promise<CurrentSessionResponse> {
    const credential = await this.ownership.verify(request);
    if (isNull(credential.hash)) {
      await this.ownership.issue(reply);

      return { state: null, expired: credential.expired };
    }
    const session = await this.database.client.session.findUnique({
      where: { accessTokenHash: credential.hash },
      include: SessionPolicy.RecordInclude,
    });
    if (isNull(session)) {
      return { state: null, expired: false };
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.ownership.issue(reply);

      return { state: null, expired: true };
    }

    return { state: SessionProjection.read(session), expired: false };
  }

  async create(
    request: FastifyRequest,
    _reply: FastifyReply,
    document: unknown,
    parameters: unknown,
  ): Promise<SessionState> {
    this.ownership.assertMutation(request);
    const body = SessionInputs.create(document);
    const query = SessionInputs.query(parameters);
    const fingerprint = SessionCreation.fingerprint(body, query);
    const credentialHash = await this.ownership.requireCredential(request);

    return this.database.client.$transaction(async (transaction) => {
      const existing = await transaction.session.findUnique({
        where: { accessTokenHash: credentialHash },
        include: SessionPolicy.RecordInclude,
      });
      if (!isNull(existing)) {
        return SessionCreation.replay(transaction, existing, body, fingerprint);
      }

      return this.createOwned(transaction, credentialHash, body, query, fingerprint);
    });
  }

  private async createOwned(
    transaction: Prisma.TransactionClient,
    credentialHash: string,
    body: CreateSessionRequest,
    query: SessionQuery,
    fingerprint: string,
  ): Promise<SessionState> {
    const funnel = await transaction.funnel.findUnique({
      where: { identifier: body.funnelIdentifier },
      include: { activeVersion: true },
    });
    if (!funnel?.activeVersion) {
      throw new PublicRequestError(
        HttpStatus.NOT_FOUND,
        SessionErrorCode.Unavailable,
        SessionMessages.Unavailable,
      );
    }
    const validated = FunnelConfigurations.validate(funnel.activeVersion.document);
    if (!validated.valid) {
      throw new Error(SessionMessages.Corrupted);
    }
    const configuration = validated.configuration;
    const assignment = SessionCreation.assignment(configuration, query);
    const first = FunnelEvaluation.evaluate(configuration, assignment.variant, {}).route.steps[0];
    if (!first) {
      throw new Error(SessionMessages.Corrupted);
    }
    const acquisitionParameters = SessionInputs.acquisition(query);
    const session = await transaction.session.create({
      data: {
        accessTokenHash: credentialHash,
        versionIdentifier: funnel.activeVersion.identifier,
        experimentIdentifier: configuration.experiment.id,
        variant: assignment.variant,
        assignmentSource: assignment.source,
        trafficOrigin: SessionPolicy.TrafficOrigin,
        acquisitionParameters,
        campaign: acquisitionParameters.utm_campaign ?? null,
        currentStepIdentifier: first.id,
        expiresAt: new Date(
          Date.now() + configuration.session.ttlHours * SessionPolicy.MillisecondsPerHour,
        ),
      },
      include: SessionPolicy.RecordInclude,
    });
    const state = SessionProjection.read(session);
    const response = SessionSnapshots.json(state);
    await transaction.session.update({
      where: { identifier: session.identifier },
      data: { initialState: response },
    });
    await transaction.sessionOperation.create({
      data: {
        sessionIdentifier: session.identifier,
        operationIdentifier: body.operationIdentifier,
        requestFingerprint: fingerprint,
        response,
      },
    });
    await SessionEvents.started(transaction, session, body.clientTimestamp);

    return state;
  }
}
