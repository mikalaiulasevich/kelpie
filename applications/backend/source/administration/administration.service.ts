import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { isNull, isString } from 'es-toolkit/predicate';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Administrator, Prisma } from '../../generated/prisma/client.js';
import { DatabaseService } from '../database/database.service.js';
import { ApplicationEnvironmentService } from '../environment/application-environment.js';
import { ApplicationMode } from '../environment/environment-policy.js';
import { AdministrationMessages } from './administration-messages.js';
import { AdministrationPolicy } from './administration-policy.js';
import { AdministrationPasswords } from './administration-passwords.js';
import { AdministrationValidation } from './administration-validation.js';
import type { AdministratorCredentials, AdministratorIdentity } from './administration-types.js';

const AdministrationTokens = {
  hash(token: string): string {
    return createHash(AdministrationPolicy.TokenHashAlgorithm)
      .update(token)
      .digest(AdministrationPolicy.TokenHashEncoding);
  },

  read(request: FastifyRequest): string {
    const token = request.cookies[AdministrationPolicy.CookieName];
    if (!isString(token) || !AdministrationPolicy.TokenPattern.test(token)) {
      throw new UnauthorizedException(AdministrationMessages.AuthenticationRequired);
    }

    return token;
  },
} as const;

const AdministrationRecords = {
  identity(administrator: AdministratorIdentity): AdministratorIdentity {
    return { identifier: administrator.identifier, username: administrator.username };
  },

  async provision(
    transaction: Prisma.TransactionClient,
    username: string,
    passwordHash: string,
  ): Promise<Administrator> {
    const current = await transaction.administrator.findFirst();
    const data = { username, passwordHash };

    if (isNull(current)) {
      return transaction.administrator.create({ data });
    }

    return transaction.administrator.update({
      where: { identifier: current.identifier },
      data,
    });
  },
} as const;

@Injectable()
export class AdministrationService {
  private readonly passwords = new AdministrationPasswords();

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ApplicationEnvironmentService)
    private readonly environment: ApplicationEnvironmentService,
  ) {}

  assertMutationOrigin(request: FastifyRequest): void {
    if (
      request.headers.origin !== this.environment.values.administrationOrigin ||
      request.headers[AdministrationPolicy.MutationHeader] !==
        AdministrationPolicy.MutationHeaderValue
    ) {
      throw new ForbiddenException(AdministrationMessages.InvalidOrigin);
    }
  }

  async authorize(request: FastifyRequest): Promise<AdministratorIdentity> {
    const token = AdministrationTokens.read(request);
    const session = await this.database.client.administratorSession.findUnique({
      where: { accessTokenHash: AdministrationTokens.hash(token) },
      select: {
        revokedAt: true,
        expiresAt: true,
        administrator: { select: { identifier: true, username: true } },
      },
    });

    if (
      isNull(session) ||
      !isNull(session.revokedAt) ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException(AdministrationMessages.AuthenticationRequired);
    }

    return AdministrationRecords.identity(session.administrator);
  }

  async provision(username: string, password: string): Promise<AdministratorIdentity> {
    if (!AdministrationValidation.provisioning({ username, password })) {
      throw new BadRequestException(AdministrationMessages.InvalidProvisioning);
    }

    const passwordHash = await this.passwords.hash(password);

    return this.database.client.$transaction(async (transaction) => {
      const administrator = await AdministrationRecords.provision(
        transaction,
        username,
        passwordHash,
      );
      await transaction.administratorSession.updateMany({
        where: { administratorIdentifier: administrator.identifier, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      return AdministrationRecords.identity(administrator);
    });
  }

  async signIn(
    request: FastifyRequest,
    reply: FastifyReply,
    body: unknown,
  ): Promise<AdministratorIdentity> {
    this.assertMutationOrigin(request);
    if (!AdministrationValidation.credentials(body)) {
      throw new UnauthorizedException(AdministrationMessages.InvalidCredentials);
    }

    const administrator = await this.verifyCredentials(body);
    await this.createSession(administrator, reply);

    return AdministrationRecords.identity(administrator);
  }

  async signOut(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    this.assertMutationOrigin(request);
    await this.authorize(request);
    await this.database.client.administratorSession.updateMany({
      where: {
        accessTokenHash: AdministrationTokens.hash(AdministrationTokens.read(request)),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    reply.clearCookie(AdministrationPolicy.CookieName, { path: AdministrationPolicy.CookiePath });
  }

  private async verifyCredentials(credentials: AdministratorCredentials): Promise<Administrator> {
    const { username, password } = credentials;
    const administrator = await this.database.client.administrator.findFirst();
    const verified = await this.passwords.verify(password, administrator?.passwordHash);
    if (!verified || isNull(administrator) || administrator.username !== username) {
      throw new UnauthorizedException(AdministrationMessages.InvalidCredentials);
    }

    return administrator;
  }

  private async createSession(administrator: Administrator, reply: FastifyReply): Promise<void> {
    const token = randomBytes(AdministrationPolicy.TokenBytes).toString(
      AdministrationPolicy.BinaryEncoding,
    );
    const expiresAt = new Date(Date.now() + AdministrationPolicy.SessionLifetimeMilliseconds);
    await this.database.client.$transaction(async (transaction) => {
      const current = await transaction.administrator.findUnique({
        where: { identifier: administrator.identifier },
      });
      if (isNull(current) || current.passwordHash !== administrator.passwordHash) {
        throw new UnauthorizedException(AdministrationMessages.InvalidCredentials);
      }

      await transaction.administratorSession.deleteMany({
        where: { administratorIdentifier: administrator.identifier },
      });
      await transaction.administratorSession.create({
        data: {
          administratorIdentifier: administrator.identifier,
          accessTokenHash: AdministrationTokens.hash(token),
          expiresAt,
        },
      });
    });
    reply.setCookie(AdministrationPolicy.CookieName, token, {
      path: AdministrationPolicy.CookiePath,
      httpOnly: true,
      sameSite: AdministrationPolicy.CookieSameSite,
      secure: this.environment.values.mode === ApplicationMode.Production,
      expires: expiresAt,
    });
  }
}
