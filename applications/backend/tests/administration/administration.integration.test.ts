import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AdministrationService } from '../../source/administration/administration.service.js';
import { AdministrationFixture } from '../fixtures/administration.js';
import type { BackendApplicationFixture } from '../fixtures/backend-application.js';

describe('administrator sessions', () => {
  let application: BackendApplicationFixture;

  beforeEach(async () => {
    application = await AdministrationFixture.create();
  });

  afterEach(async () => {
    await application?.close();
  });

  it('stores only token hashes and sets a strict HttpOnly cookie', async () => {
    const response = await AdministrationFixture.signIn(application);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ identifier: expect.any(String), username: 'reviewer' });
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('SameSite=Strict');
    expect(response.headers.get('set-cookie')).toContain('Path=/api/administration');
    const cookie = AdministrationFixture.cookie(response);
    const session = await application.database.administratorSession.findFirstOrThrow();
    expect(cookie).not.toContain(session.accessTokenHash);
    expect(session.accessTokenHash).toMatch(/^[a-f0-9]{64}$/);
    const authorized = await application.request('/api/administration/session', {
      headers: { cookie },
    });
    expect(authorized.status).toBe(200);
    expect(authorized.headers.get('cache-control')).toBe('no-store');
  });

  it('rejects missing credentials and disallowed mutation origins', async () => {
    const anonymous = await application.request('/api/administration/session');
    expect(anonymous.status).toBe(401);
    const forbidden = await application.request('/api/administration/sign-in', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(AdministrationFixture.Credentials),
    });
    expect(forbidden.status).toBe(403);
    const missingHeader = await application.request('/api/administration/sign-in', {
      method: 'POST',
      headers: { origin: 'http://127.0.0.1:5173', 'content-type': 'application/json' },
      body: JSON.stringify(AdministrationFixture.Credentials),
    });
    const wrongOrigin = await application.request('/api/administration/sign-in', {
      method: 'POST',
      headers: { ...AdministrationFixture.Headers, origin: 'https://attacker.example' },
      body: JSON.stringify(AdministrationFixture.Credentials),
    });
    expect(missingHeader.status).toBe(403);
    expect(wrongOrigin.status).toBe(403);
    expect(await application.database.administratorSession.count()).toBe(0);
  });

  it('rejects wrong passwords with a generic response', async () => {
    const response = await AdministrationFixture.signIn(application, 'private-wrong-password');
    expect(response.status).toBe(401);
    const wrongPassword = await response.json();
    const unknownUser = await application.request('/api/administration/sign-in', {
      method: 'POST',
      headers: AdministrationFixture.Headers,
      body: JSON.stringify({
        username: 'unknown-user',
        password: AdministrationFixture.Credentials.password,
      }),
    });
    expect(unknownUser.status).toBe(401);
    const unknownResponse = await unknownUser.json();
    expect(unknownResponse).toEqual({
      statusCode: 401,
      code: 'unauthorized',
      message: 'Request could not be processed.',
      requestIdentifier: expect.any(String),
    });
    expect(wrongPassword).toEqual({
      statusCode: 401,
      code: 'unauthorized',
      message: 'Request could not be processed.',
      requestIdentifier: expect.any(String),
    });
    expect(JSON.stringify(wrongPassword)).not.toContain('private-wrong-password');
    expect(await application.database.administratorSession.count()).toBe(0);
  });

  it('revokes the cookie session on sign-out and refuses expired sessions', async () => {
    const response = await AdministrationFixture.signIn(application);
    const cookie = AdministrationFixture.cookie(response);
    const forbidden = await application.request('/api/administration/sign-out', {
      method: 'POST',
      headers: { cookie },
    });
    expect(forbidden.status).toBe(403);
    const signedOut = await application.request('/api/administration/sign-out', {
      method: 'POST',
      headers: { ...AdministrationFixture.Headers, cookie },
      body: '{}',
    });
    expect(signedOut.status).toBe(204);
    expect(await AdministrationFixture.sessionStatus(application, cookie)).toBe(401);
    const replacement = AdministrationFixture.cookie(
      await AdministrationFixture.signIn(application),
    );
    await application.database.administratorSession.updateMany({
      data: { expiresAt: new Date(0) },
    });
    expect(await AdministrationFixture.sessionStatus(application, replacement)).toBe(401);
  });

  it('rotates one administrator credential and invalidates old sessions', async () => {
    const cookie = AdministrationFixture.cookie(await AdministrationFixture.signIn(application));
    const previous = await application.database.administrator.findFirstOrThrow();
    const identity = await application
      .getService(AdministrationService)
      .provision('reviewer', 'a-new-long-password');
    expect(identity.identifier).toBe(previous.identifier);
    expect(await application.database.administrator.count()).toBe(1);
    expect(await AdministrationFixture.sessionStatus(application, cookie)).toBe(401);
    expect((await AdministrationFixture.signIn(application)).status).toBe(401);
    expect((await AdministrationFixture.signIn(application, 'a-new-long-password')).status).toBe(
      200,
    );
  });

  it('replaces the prior browser session without accumulating rows', async () => {
    const cookie = AdministrationFixture.cookie(await AdministrationFixture.signIn(application));
    const replacement = AdministrationFixture.cookie(
      await AdministrationFixture.signIn(application),
    );
    expect(replacement).not.toBe(cookie);
    expect(await application.database.administratorSession.count()).toBe(1);
    expect(await AdministrationFixture.sessionStatus(application, cookie)).toBe(401);
    expect(await AdministrationFixture.sessionStatus(application, replacement)).toBe(200);
  });

  it('bounds sign-in attempts per IP', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await application.request('/api/administration/sign-in', {
        method: 'POST',
        headers: AdministrationFixture.Headers,
        body: '{}',
      });
      expect(response.status).toBe(401);
    }

    const response = await AdministrationFixture.signIn(application);
    expect(response.status).toBe(429);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      statusCode: 429,
      code: 'rate_limited',
      message: 'Too many requests. Try again later.',
      requestIdentifier: response.headers.get('x-request-id'),
    });
    expect(await application.database.administratorSession.count()).toBe(0);
  });
});
