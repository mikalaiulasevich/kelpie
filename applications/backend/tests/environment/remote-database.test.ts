import { describe, expect, it } from 'vitest';
import { ApplicationEnvironmentReader } from '../../source/environment/read-application-environment.js';
import { DatabaseAdapters } from '../../source/database/database-adapters.js';

describe('Remote database environment', () => {
  it('preserves a secure remote host and token and selects libSQL on either runtime', () => {
    const environment = ApplicationEnvironmentReader.read({
      DATABASE_URL: 'libsql://kelpie-example.turso.io',
      DATABASE_AUTH_TOKEN: 'test-token',
    });
    expect(environment.databaseUrl).toBe('libsql://kelpie-example.turso.io');
    expect(environment.databaseAuthToken).toBe('test-token');
    expect(
      DatabaseAdapters.create(environment.databaseUrl, environment.databaseAuthToken).adapterName,
    ).toBe('@prisma/adapter-libsql');
  });

  it('requires a token only for remote databases without echoing rejected secrets', () => {
    expect(() =>
      ApplicationEnvironmentReader.read({ DATABASE_URL: 'libsql://example.turso.io' }),
    ).toThrow('DATABASE_AUTH_TOKEN');
    expect(() => ApplicationEnvironmentReader.read({ DATABASE_AUTH_TOKEN: 'secret' })).toThrow(
      'only supported',
    );
    expect(() =>
      ApplicationEnvironmentReader.read({
        DATABASE_URL: 'libsql://user:secret@example.turso.io',
        DATABASE_AUTH_TOKEN: 'secret',
      }),
    ).toThrow('DATABASE_URL');
  });

  it('rejects trailing newlines in remote hosts and tokens', () => {
    expect(() =>
      ApplicationEnvironmentReader.read({
        DATABASE_URL: 'libsql://example.turso.io\n',
        DATABASE_AUTH_TOKEN: 'secret',
      }),
    ).toThrow('DATABASE_URL');
    expect(() =>
      ApplicationEnvironmentReader.read({
        DATABASE_URL: 'libsql://example.turso.io',
        DATABASE_AUTH_TOKEN: 'secret\n',
      }),
    ).toThrow('DATABASE_AUTH_TOKEN');
  });

  it('makes loopback proxy trust explicit and rejects ambiguous values', () => {
    expect(ApplicationEnvironmentReader.read({}).trustProxyLoopback).toBe(false);
    expect(
      ApplicationEnvironmentReader.read({ TRUST_PROXY_LOOPBACK: 'true' }).trustProxyLoopback,
    ).toBe(true);
    expect(() => ApplicationEnvironmentReader.read({ TRUST_PROXY_LOOPBACK: '1' })).toThrow(
      'TRUST_PROXY_LOOPBACK',
    );
  });
});
