import { EnvironmentCases } from '../cases/environment-cases.js';
import { describe, expect, it } from 'vitest';
import { ApplicationEnvironmentReader } from '../../source/environment/read-application-environment.js';

describe('Application environment validation', () => {
  it('uses loopback and an application-relative SQLite file by default', () => {
    const environment = ApplicationEnvironmentReader.read({});
    expect(environment.host).toBe('127.0.0.1');
    expect(environment.port).toBe(3000);
    expect(environment.logLevel).toBe('info');
    expect(environment.databaseUrl).toMatch(
      /\/applications\/backend\/data\/funnel-runtime\.sqlite$/,
    );
  });

  it.each(EnvironmentCases.InvalidPorts)('rejects invalid port %s', (port) => {
    expect(() => ApplicationEnvironmentReader.read({ PORT: port })).toThrow('PORT');
  });

  it.each(EnvironmentCases.UnsupportedDatabaseUrls)(
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
  it.each(EnvironmentCases.AcceptedLogLevels)('accepts log level %s', (logLevel) => {
    expect(ApplicationEnvironmentReader.read({ LOG_LEVEL: logLevel }).logLevel).toBe(logLevel);
  });

  it.each(EnvironmentCases.RejectedLogLevels)(
    'rejects unsupported log level %j without echoing it',
    (logLevel) => {
      expect(() => ApplicationEnvironmentReader.read({ LOG_LEVEL: logLevel })).toThrow(
        /^LOG_LEVEL must be trace, debug, info, warn, error, or fatal\.$/,
      );
    },
  );

  it.each(EnvironmentCases.AcceptedModes)('accepts mode %s', (mode) => {
    expect(
      ApplicationEnvironmentReader.read({
        NODE_ENV: mode,
        ADMINISTRATION_ORIGIN: 'https://kelpie.example',
      }).mode,
    ).toBe(mode);
  });

  it.each(EnvironmentCases.AcceptedPorts)('preserves valid port %j', (port) => {
    expect(ApplicationEnvironmentReader.read({ PORT: port }).port).toBe(Number(port));
  });

  it.each(EnvironmentCases.MalformedPorts)('rejects malformed port %j', (port) => {
    expect(() => ApplicationEnvironmentReader.read({ PORT: port })).toThrow('PORT');
  });

  it.each(EnvironmentCases.AcceptedHosts)('preserves accepted host %j', (host) => {
    expect(ApplicationEnvironmentReader.read({ HOST: host }).host).toBe(host);
  });

  it.each(EnvironmentCases.UnsupportedHosts)('rejects unsupported host %j', (host) => {
    expect(() => ApplicationEnvironmentReader.read({ HOST: host })).toThrow('HOST');
  });

  it.each(EnvironmentCases.UnsafeDatabaseUrls)('rejects unsafe database URL %j', (databaseUrl) => {
    expect(() => ApplicationEnvironmentReader.read({ DATABASE_URL: databaseUrl })).toThrow(
      'DATABASE_URL',
    );
  });

  it.each(EnvironmentCases.AbsoluteDatabaseUrls)(
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
        LOG_LEVEL: undefined,
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
    ).toThrow(
      'DATABASE_URL must identify a local SQLite file or a secure libsql host without credentials or query parameters.',
    );
  });
});

describe('Administration origin boundary', () => {
  it.each(EnvironmentCases.RejectedAdministrationOrigins)(
    'rejects malformed origin %j',
    (origin) => {
      expect(() => ApplicationEnvironmentReader.read({ ADMINISTRATION_ORIGIN: origin })).toThrow(
        'ADMINISTRATION_ORIGIN',
      );
    },
  );

  it.each(EnvironmentCases.RejectedProductionOrigins)(
    'requires an explicit HTTPS origin in production: %j',
    (origin) => {
      expect(() =>
        ApplicationEnvironmentReader.read({
          NODE_ENV: 'production',
          ADMINISTRATION_ORIGIN: origin,
        }),
      ).toThrow('ADMINISTRATION_ORIGIN');
    },
  );

  it('preserves an exact HTTPS origin and uses loopback only outside production', () => {
    expect(ApplicationEnvironmentReader.read({}).administrationOrigin).toBe(
      'http://127.0.0.1:5173',
    );
    expect(
      ApplicationEnvironmentReader.read({
        NODE_ENV: 'production',
        ADMINISTRATION_ORIGIN: 'https://kelpie.example:8443',
      }).administrationOrigin,
    ).toBe('https://kelpie.example:8443');
  });
});

describe('Quiz origin boundary', () => {
  it.each(EnvironmentCases.RejectedAdministrationOrigins)(
    'rejects malformed quiz origin %j',
    (origin) => {
      expect(() => ApplicationEnvironmentReader.read({ QUIZ_ORIGIN: origin })).toThrow(
        'QUIZ_ORIGIN',
      );
    },
  );

  it('defaults to the local quiz in development and the explicit administration origin in production', () => {
    expect(ApplicationEnvironmentReader.read({}).quizOrigin).toBe('http://127.0.0.1:3001');
    expect(
      ApplicationEnvironmentReader.read({
        NODE_ENV: 'production',
        ADMINISTRATION_ORIGIN: 'https://admin.example',
      }).quizOrigin,
    ).toBe('https://admin.example');
    expect(
      ApplicationEnvironmentReader.read({
        NODE_ENV: 'production',
        ADMINISTRATION_ORIGIN: 'https://admin.example',
        QUIZ_ORIGIN: 'https://quiz.example',
      }).quizOrigin,
    ).toBe('https://quiz.example');
    expect(() =>
      ApplicationEnvironmentReader.read({
        NODE_ENV: 'production',
        ADMINISTRATION_ORIGIN: 'https://admin.example',
        QUIZ_ORIGIN: 'http://quiz.example',
      }),
    ).toThrow('QUIZ_ORIGIN');
  });
});
