import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseService } from '../../source/database/database.service.js';
import { AdministrationBootstrapService } from '../../source/administration/administration-bootstrap.service.js';
import { AdministrationFixture } from '../fixtures/administration.js';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';

describe('first-deployment administrator bootstrap', () => {
  let application: BackendApplicationFixture;

  beforeEach(async () => {
    application = await BackendApplicationFixture.create();
  });

  afterEach(async () => {
    await application?.close();
  });

  it('creates one usable administrator without storing its plaintext password', async () => {
    const result = await application
      .getService(AdministrationBootstrapService)
      .initialize(
        AdministrationFixture.Credentials.username,
        AdministrationFixture.Credentials.password,
      );
    expect(result).toEqual({ status: 'created' });
    const administrator = await application.database.administrator.findFirstOrThrow();
    expect(administrator.username).toBe('reviewer');
    expect(administrator.passwordHash).not.toContain(AdministrationFixture.Credentials.password);
    expect(administrator.createdAt).toBeInstanceOf(Date);
    expect((await AdministrationFixture.signIn(application)).status).toBe(200);
  });

  it('rejects a first deployment without valid credentials without writing an account', async () => {
    const service = application.getService(AdministrationBootstrapService);
    await expect(service.initialize()).rejects.toThrow('first deployment');
    await expect(service.initialize('reviewer', 'short')).rejects.toThrow('first deployment');
    expect(await application.database.administrator.count()).toBe(0);
  });

  it('skips existing accounts despite missing or changed environment credentials and preserves sessions', async () => {
    const service = application.getService(AdministrationBootstrapService);
    await service.initialize(
      AdministrationFixture.Credentials.username,
      AdministrationFixture.Credentials.password,
    );
    const before = await application.database.administrator.findFirstOrThrow();
    const response = await AdministrationFixture.signIn(application);
    const cookie = AdministrationFixture.cookie(response);
    const sessionBefore = await application.database.administratorSession.findFirstOrThrow();
    expect(await service.initialize()).toEqual({ status: 'existing' });
    expect(await service.initialize('another-administrator', 'a-different-valid-password')).toEqual(
      { status: 'existing' },
    );
    expect(await application.database.administrator.findFirstOrThrow()).toEqual(before);
    expect(await application.database.administratorSession.findFirstOrThrow()).toEqual(
      sessionBefore,
    );
    expect(await AdministrationFixture.sessionStatus(application, cookie)).toBe(200);
  });

  it('atomically admits only one competing first deployment with different usernames', async () => {
    const service = application.getService(AdministrationBootstrapService);
    const competingService = new AdministrationBootstrapService(
      application.getService(DatabaseService),
    );
    const results = await Promise.all([
      service.initialize('first', 'first-valid-bootstrap-password'),
      competingService.initialize('second', 'second-valid-bootstrap-password'),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual(['created', 'existing']);
    expect(await application.database.administrator.count()).toBe(1);
  });
});
