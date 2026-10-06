import { EnvironmentCases } from '../cases/environment-cases.js';
import { describe, expect, it } from 'vitest';
import { ApplicationEnvironmentReader } from '../../source/environment/read-application-environment.js';

describe('Application environment validation', () => {
  it('uses loopback and an application-relative SQLite file by default', () => {
    const environment = ApplicationEnvironmentReader.read({});
    expect(environment.host).toBe('127.0.0.1');
    expect(environment.port).toBe(3000);
    expect(environment.databaseUrl).toMatch(
      /\/applications\/backend\/data\/funnel-runtime\.sqlite$/,
    );
  });

  it.each(EnvironmentCases.invalidPorts)('rejects invalid port %s', (port) => {
    expect(() => ApplicationEnvironmentReader.read({ PORT: port })).toThrow('PORT');
  });

  it.each(EnvironmentCases.unsupportedDatabaseUrls)(
    'rejects unsupported database URL %s',
    (databaseUrl) => {
      expect(() => ApplicationEnvironmentReader.read({ DATABASE_URL: databaseUrl })).toThrow(
        'DATABASE_URL',
      );
    },
  );

  it('rejects unsupported execution modes', () => {
    expect(() => ApplicationEnvironmentReader.read({ NODE_ENV: 'staging' })).toThrow('NODE_ENV');
  });
});

describe('Application environment boundary compatibility', () => {
  it.each(EnvironmentCases.acceptedModes)('accepts mode %s', (mode) => {
    expect(ApplicationEnvironmentReader.read({ NODE_ENV: mode }).mode).toBe(mode);
  });

  it.each(EnvironmentCases.acceptedPorts)('preserves valid port %j', (port) => {
    expect(ApplicationEnvironmentReader.read({ PORT: port }).port).toBe(Number(port));
  });

  it.each(EnvironmentCases.malformedPorts)('rejects malformed port %j', (port) => {
    expect(() => ApplicationEnvironmentReader.read({ PORT: port })).toThrow('PORT');
  });

  it.each(EnvironmentCases.acceptedHosts)('preserves accepted host %j', (host) => {
    expect(ApplicationEnvironmentReader.read({ HOST: host }).host).toBe(host);
  });

  it.each(EnvironmentCases.unsupportedHosts)('rejects unsupported host %j', (host) => {
    expect(() => ApplicationEnvironmentReader.read({ HOST: host })).toThrow('HOST');
  });

  it.each(EnvironmentCases.unsafeDatabaseUrls)('rejects unsafe database URL %j', (databaseUrl) => {
    expect(() => ApplicationEnvironmentReader.read({ DATABASE_URL: databaseUrl })).toThrow(
      'DATABASE_URL',
    );
  });

  it.each(EnvironmentCases.absoluteDatabaseUrls)(
    'preserves supported absolute database URL %j',
    (databaseUrl) => {
      expect(ApplicationEnvironmentReader.read({ DATABASE_URL: databaseUrl }).databaseUrl).toBe(
        databaseUrl,
      );
    },
  );

  it('uses defaults for undefined values without replacing explicit empty values', () => {
    expect(
      ApplicationEnvironmentReader.read({
        NODE_ENV: undefined,
        HOST: undefined,
        PORT: undefined,
        DATABASE_URL: undefined,
      }),
    ).toEqual(ApplicationEnvironmentReader.read({}));
    expect(() => ApplicationEnvironmentReader.read({ NODE_ENV: '' })).toThrow('NODE_ENV');
    expect(() => ApplicationEnvironmentReader.read({ DATABASE_URL: '' })).toThrow('DATABASE_URL');
  });

  it('does not expose rejected values in validation errors', () => {
    expect(() =>
      ApplicationEnvironmentReader.read({ DATABASE_URL: 'https://secret:password@host' }),
    ).toThrow('DATABASE_URL must identify a local SQLite file without query parameters.');
  });
});
