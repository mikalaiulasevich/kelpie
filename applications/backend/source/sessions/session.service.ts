import { createHash, randomInt } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ExperimentVariant, type FunnelConfiguration } from '@kelpie/contracts';
import { FunnelEvaluation } from '@kelpie/funnel-runtime';
import { isNull, isUndefined } from 'es-toolkit/predicate';
import { sortBy } from 'es-toolkit/array';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Prisma } from '../../generated/prisma/client.js';
import { ConfigurationImportDocument } from '../configurations/configuration-import-document.js';
import { DatabaseErrors } from '../database/database-errors.js';
import { SessionRecords } from './session-records.js';
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
  ActiveSessionConfiguration,
} from './session-types.js';

const SessionCreation = {
  fingerprint(
    body: CreateSessionRequest,
    query: SessionQuery,
    configuration: FunnelConfiguration,
  ): string {
    const relevantQuery = {
      ...SessionInputs.acquisition(query),
      [configuration.experiment.overrideQueryParam]:
        query[configuration.experiment.overrideQueryParam] ?? null,
    };

    return createHash(SessionPolicy.HashAlgorithm)
      .update(
        JSON.stringify([
          SessionPolicy.CreationKind,
          body.funnelIdentifier,
          body.clientTimestamp,
          sortBy(Object.entries(relevantQuery), [([key]) => key]),
        ]),
      )
      .digest(SessionPolicy.HashEncoding);
  },

  assignment(configuration: FunnelConfiguration, query: SessionQuery) {
    const override = query[configuration.experiment.overrideQueryParam];

    if (override === ExperimentVariant.A || override === ExperimentVariant.B) {
      return { variant: override, source: SessionPolicy.Assignment.Forced };
    }

    if (!isUndefined(override)) {
      throw new PublicRequestError(
        HttpStatus.BAD_REQUEST,
        SessionErrorCode.Invalid,
        SessionMessages.Invalid,
      );
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
    query: SessionQuery,
  ): Promise<SessionState> {
    const configuration = SessionProjection.configuration(session);
    const fingerprint = SessionCreation.fingerprint(body, query, configuration);

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new PublicRequestError(
        HttpStatus.UNAUTHORIZED,
        SessionErrorCode.Unauthorized,
        SessionMessages.Unauthorized,
      );
    }

    const previousOperation = await transaction.sessionOperation.findUnique({
      where: {
        sessionIdentifier_operationIdentifier: {
          sessionIdentifier: session.identifier,
          operationIdentifier: body.operationIdentifier,
        },
      },
    });

    if (isNull(previousOperation)) {
      throw new PublicRequestError(
        HttpStatus.CONFLICT,
        SessionErrorCode.Bound,
        SessionMessages.Bound,
      );
    }

    if (previousOperation.requestFingerprint !== fingerprint) {
      throw new PublicRequestError(
        HttpStatus.CONFLICT,
        SessionErrorCode.Conflict,
        SessionMessages.Conflict,
      );
    }

    return SessionSnapshots.read(previousOperation.response);
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
      await this.ownership.issue(reply, this.ownership.isPreview(request));

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
      await this.ownership.issue(reply, this.ownership.isPreview(request));

      return { state: null, expired: true };
    }

    return { state: SessionProjection.read(session), expired: false };
  }

  async create(
    request: FastifyRequest,
    reply: FastifyReply,
    document: unknown,
    parameters: unknown,
  ): Promise<SessionState> {
    this.ownership.assertMutation(request);
    if (this.ownership.isPreview(request)) {
      throw new PublicRequestError(
        HttpStatus.FORBIDDEN,
        SessionErrorCode.Forbidden,
        SessionMessages.Forbidden,
      );
    }

    const body = SessionInputs.create(document);
    const query = SessionInputs.query(parameters);
    const credentialHash = await this.ownership.requireCredential(request);

    const state = await this.createOrReplay(credentialHash, body, query);
    const session = await SessionRecords.requireOwned(this.database.client, credentialHash);
    this.ownership.refresh(request, reply, session.expiresAt);

    return state;
  }

  async preview(
    reply: FastifyReply,
    body: CreateSessionRequest,
    configuration: ActiveSessionConfiguration,
    variant: ExperimentVariant,
    administratorIdentifier: string,
  ): Promise<SessionState> {
    const fingerprint = createHash(SessionPolicy.HashAlgorithm)
      .update(
        JSON.stringify([
          'preview',
          administratorIdentifier,
          configuration.identifier,
          variant,
          body.clientTimestamp,
        ]),
      )
      .digest(SessionPolicy.HashEncoding);
    const credentialHash = await this.ownership.issue(reply, true);

    return this.database.client.$transaction(async (transaction) => {
      const existing = await transaction.sessionOperation.findFirst({
        where: { operationIdentifier: body.operationIdentifier },
      });

      if (existing) {
        if (existing.requestFingerprint !== fingerprint) {
          throw new PublicRequestError(
            HttpStatus.CONFLICT,
            SessionErrorCode.Conflict,
            SessionMessages.Conflict,
          );
        }

        await transaction.session.update({
          where: { identifier: existing.sessionIdentifier },
          data: { accessTokenHash: credentialHash },
        });

        return SessionSnapshots.read(existing.response);
      }

      return this.createOwned(
        transaction,
        credentialHash,
        body,
        { [configuration.configuration.experiment.overrideQueryParam]: variant },
        { configuration, fingerprint },
      );
    });
  }

  private async createOrReplay(
    credentialHash: string,
    body: CreateSessionRequest,
    query: SessionQuery,
  ): Promise<SessionState> {
    try {
      return await this.createTransaction(credentialHash, body, query);
    } catch (error) {
      if (!DatabaseErrors.isUniqueConstraint(error)) {
        throw error;
      }

      const winningSession = await SessionRecords.requireOwned(
        this.database.client,
        credentialHash,
      );

      return SessionCreation.replay(this.database.client, winningSession, body, query);
    }
  }

  private createTransaction(
    credentialHash: string,
    body: CreateSessionRequest,
    query: SessionQuery,
  ): Promise<SessionState> {
    return this.database.client.$transaction(async (transaction) => {
      const existingSession = await transaction.session.findUnique({
        where: { accessTokenHash: credentialHash },
        include: SessionPolicy.RecordInclude,
      });

      if (!isNull(existingSession)) {
        return SessionCreation.replay(transaction, existingSession, body, query);
      }

      return this.createOwned(transaction, credentialHash, body, query);
    });
  }

  private async createOwned(
    transaction: Prisma.TransactionClient,
    credentialHash: string,
    body: CreateSessionRequest,
    query: SessionQuery,
    preview?: { configuration: ActiveSessionConfiguration; fingerprint: string },
  ): Promise<SessionState> {
    const active =
      preview?.configuration ??
      (await this.activeConfiguration(transaction, body.funnelIdentifier));
    const { configuration } = active;
    const fingerprint =
      preview?.fingerprint ?? SessionCreation.fingerprint(body, query, configuration);
    const assignment = SessionCreation.assignment(configuration, query);
    const firstStep = FunnelEvaluation.evaluate(configuration, assignment.variant, {}).route
      .steps[0];

    if (!firstStep) {
      throw new Error(SessionMessages.Corrupted);
    }

    const acquisitionParameters = SessionInputs.acquisition(query);
    const session = await transaction.session.create({
      data: {
        accessTokenHash: credentialHash,
        versionIdentifier: active.identifier,
        experimentIdentifier: configuration.experiment.id,
        variant: assignment.variant,
        assignmentSource: assignment.source,
        trafficOrigin: preview ? 'synthetic' : SessionPolicy.TrafficOrigin,
        acquisitionParameters,
        campaign: acquisitionParameters.utm_campaign ?? null,
        currentStepIdentifier: firstStep.id,
        expiresAt: new Date(
          Date.now() + configuration.session.ttlHours * SessionPolicy.MillisecondsPerHour,
        ),
      },
      include: SessionPolicy.RecordInclude,
    });

    return this.recordCreation(transaction, session, body, fingerprint);
  }

  private async activeConfiguration(
    transaction: Prisma.TransactionClient,
    funnelIdentifier: string,
  ): Promise<ActiveSessionConfiguration> {
    const funnel = await transaction.funnel.findUnique({
      where: { identifier: funnelIdentifier },
      include: { activeVersion: true },
    });

    if (!funnel?.activeVersion) {
      throw new PublicRequestError(
        HttpStatus.NOT_FOUND,
        SessionErrorCode.Unavailable,
        SessionMessages.Unavailable,
      );
    }

    const prepared = ConfigurationImportDocument.prepare(funnel.activeVersion.document);

    if (!ConfigurationImportDocument.matchesVersion(funnel.activeVersion, prepared)) {
      throw new Error(SessionMessages.Corrupted);
    }

    const configuration = prepared.configuration;

    return { identifier: funnel.activeVersion.identifier, configuration };
  }

  private async recordCreation(
    transaction: Prisma.TransactionClient,
    session: OwnedSession,
    body: CreateSessionRequest,
    fingerprint: string,
  ): Promise<SessionState> {
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
