import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { isNull, isString } from 'es-toolkit/predicate';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AdministrationService } from '../administration/administration.service.js';
import { DatabaseService } from '../database/database.service.js';
import { ApplicationEnvironmentService } from '../environment/application-environment.js';
import { ApplicationMode } from '../environment/environment-policy.js';
import { PublicRequestError } from '../transport/public-request-error.js';
import { SessionPolicy, SessionErrorCode } from './session-policy.js';
import { SessionMessages } from './session-messages.js';
import type { CredentialVerification, IssuedSessionCredential } from './session-types.js';

const CredentialSignatures = {
  sign(payload: string, secret: string): string {
    return createHmac(SessionPolicy.HashAlgorithm, secret)
      .update(payload)
      .digest(SessionPolicy.BinaryEncoding);
  },

  hash(value: string): string {
    return createHash(SessionPolicy.HashAlgorithm).update(value).digest(SessionPolicy.HashEncoding);
  },
} as const;

@Injectable()
export class SessionOwnershipService {
  private signingSecret: Optional<Promise<string>>;

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AdministrationService) private readonly administration: AdministrationService,
    @Inject(ApplicationEnvironmentService)
    private readonly environment: ApplicationEnvironmentService,
  ) {}

  assertMutation(request: FastifyRequest): void {
    if (
      (request.headers.origin !== this.environment.values.administrationOrigin &&
        request.headers.origin !== this.environment.values.quizOrigin) ||
      request.headers[SessionPolicy.MutationHeader] !== SessionPolicy.MutationHeaderValue
    ) {
      throw new PublicRequestError(
        HttpStatus.FORBIDDEN,
        SessionErrorCode.Forbidden,
        SessionMessages.Forbidden,
      );
    }
  }

  async requireCredential(request: FastifyRequest): Promise<string> {
    const credential = await this.verify(request);

    if (isNull(credential.hash)) {
      throw new PublicRequestError(
        HttpStatus.UNAUTHORIZED,
        SessionErrorCode.Unauthorized,
        SessionMessages.Unauthorized,
      );
    }

    return credential.hash;
  }

  isPreview(request: FastifyRequest): boolean {
    return request.headers[SessionPolicy.PreviewHeader] === SessionPolicy.MutationHeaderValue;
  }

  async verify(request: FastifyRequest): Promise<CredentialVerification> {
    if (this.isPreview(request)) {
      await this.administration.authorize(request);
    }

    const cookie =
      request.cookies[
        this.isPreview(request) ? SessionPolicy.PreviewCookieName : SessionPolicy.CookieName
      ];
    const match = isString(cookie) ? SessionPolicy.CookiePattern.exec(cookie) : null;

    if (isNull(match)) {
      return { hash: null, expired: false };
    }

    const [, token = '', timestamp = '', signature = ''] = match;
    const payload = `${token}.${timestamp}`;
    const expected = CredentialSignatures.sign(payload, await this.secret());
    const authentic = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

    if (!authentic) {
      return { hash: null, expired: false };
    }

    const hash = CredentialSignatures.hash(`${payload}.${signature}`);
    const age = Date.now() - Number(timestamp);

    if (age < 0) {
      return { hash: null, expired: true };
    }

    if (age >= SessionPolicy.CookieLifetimeMilliseconds) {
      const bound = await this.database.client.session.findUnique({
        where: { accessTokenHash: hash },
        select: { expiresAt: true },
      });

      if (isNull(bound) || bound.expiresAt.getTime() <= Date.now()) {
        return { hash: null, expired: true };
      }
    }

    return { hash, expired: false };
  }

  refresh(request: FastifyRequest, reply: FastifyReply, expiresAt: Date): void {
    const cookie =
      request.cookies[
        this.isPreview(request) ? SessionPolicy.PreviewCookieName : SessionPolicy.CookieName
      ];

    if (isString(cookie)) {
      this.setCookie(
        reply,
        cookie,
        Math.max(0, expiresAt.getTime() - Date.now()),
        this.isPreview(request),
      );
    }
  }

  async issue(reply: FastifyReply, preview = false): Promise<string> {
    const credential = await this.prepareCredential();
    this.publishCredential(reply, credential, preview);

    return credential.hash;
  }

  async prepareCredential(): Promise<IssuedSessionCredential> {
    const token = randomBytes(SessionPolicy.TokenBytes).toString(SessionPolicy.BinaryEncoding);
    const payload = `${token}.${Date.now()}`;
    const signature = CredentialSignatures.sign(payload, await this.secret());
    const credential = `${payload}.${signature}`;
    return { hash: CredentialSignatures.hash(credential), value: credential };
  }

  publishCredential(
    reply: FastifyReply,
    credential: IssuedSessionCredential,
    preview = false,
  ): void {
    this.setCookie(reply, credential.value, SessionPolicy.CookieLifetimeMilliseconds, preview);
  }

  private setCookie(
    reply: FastifyReply,
    value: string,
    lifetimeMilliseconds: number,
    preview = false,
  ): void {
    reply.setCookie(preview ? SessionPolicy.PreviewCookieName : SessionPolicy.CookieName, value, {
      path: SessionPolicy.CookiePath,
      httpOnly: true,
      sameSite: SessionPolicy.SameSite,
      secure: this.environment.values.mode === ApplicationMode.Production,
      maxAge: Math.ceil(lifetimeMilliseconds / SessionPolicy.MillisecondsPerSecond),
    });
  }

  private async secret(): Promise<string> {
    this.signingSecret ??= this.database.client.applicationSecret
      .upsert({
        where: { identifier: SessionPolicy.SecretIdentifier },
        create: {
          identifier: SessionPolicy.SecretIdentifier,
          value: randomBytes(SessionPolicy.SecretBytes).toString(SessionPolicy.BinaryEncoding),
        },
        update: {},
      })
      .then((record) => record.value);
    try {
      return await this.signingSecret;
    } catch (error) {
      this.signingSecret = undefined;
      throw error;
    }
  }
}
