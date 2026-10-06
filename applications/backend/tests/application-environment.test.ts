import { describe, expect, it } from 'vitest';
import { readApplicationEnvironment } from '../source/environment/application-environment.js';

describe('Application environment validation', () => {
  it('uses loopback and an application-relative SQLite file by default', () => {
    const environment = readApplicationEnvironment({});
    expect(environment.host).toBe('127.0.0.1');
    expect(environment.port).toBe(3000);
    expect(environment.databaseUrl).toMatch(
      /\/applications\/backend\/data\/funnel-runtime\.sqlite$/,
    );
  });

  it.each(['0', '65536', '3000suffix', '1.5', '-1'])('rejects invalid port %s', (port) => {
    expect(() => readApplicationEnvironment({ PORT: port })).toThrow('PORT');
  });

  it.each(['postgresql://localhost/example', 'file:', 'file:./example?mode=ro'])(
    'rejects unsupported database URL %s',
    (databaseUrl) => {
      expect(() => readApplicationEnvironment({ DATABASE_URL: databaseUrl })).toThrow(
        'DATABASE_URL',
      );
    },
  );

  it('rejects unsupported execution modes', () => {
    expect(() => readApplicationEnvironment({ NODE_ENV: 'staging' })).toThrow('NODE_ENV');
  });
});

describe('Application environment boundary compatibility', () => {
  it.each(['development', 'test', 'production'])('accepts mode %s', (mode) => {
    expect(readApplicationEnvironment({ NODE_ENV: mode }).mode).toBe(mode);
  });

  it.each(['1', '00001', '65535'])('preserves valid port %j', (port) => {
    expect(readApplicationEnvironment({ PORT: port }).port).toBe(Number(port));
  });

  it.each(['', '000001', ' 3000', '3e3', 'NaN', 'Infinity', '+3000', '3000\n'])(
    'rejects malformed port %j',
    (port) => {
      expect(() => readApplicationEnvironment({ PORT: port })).toThrow('PORT');
    },
  );

  it.each(['localhost', '::1', 'a'.repeat(253)])('preserves accepted host %j', (host) => {
    expect(readApplicationEnvironment({ HOST: host }).host).toBe(host);
  });

  it.each(['', 'a'.repeat(254), 'example/path', 'example host', 'localhost\n'])(
    'rejects unsupported host %j',
    (host) => {
      expect(() => readApplicationEnvironment({ HOST: host })).toThrow('HOST');
    },
  );

  it.each(['file:./example#fragment', 'file:./example\0', 'file:', 'https://example'])(
    'rejects unsafe database URL %j',
    (databaseUrl) => {
      expect(() => readApplicationEnvironment({ DATABASE_URL: databaseUrl })).toThrow(
        'DATABASE_URL',
      );
    },
  );

  it.each(['file:/tmp/kelpie.sqlite', 'file:/tmp/kelpie\n.sqlite'])(
    'preserves supported absolute database URL %j',
    (databaseUrl) => {
      expect(readApplicationEnvironment({ DATABASE_URL: databaseUrl }).databaseUrl).toBe(
        databaseUrl,
      );
    },
  );

  it('uses defaults for undefined values without replacing explicit empty values', () => {
    expect(
      readApplicationEnvironment({
        NODE_ENV: undefined,
        HOST: undefined,
        PORT: undefined,
        DATABASE_URL: undefined,
      }),
    ).toEqual(readApplicationEnvironment({}));
    expect(() => readApplicationEnvironment({ NODE_ENV: '' })).toThrow('NODE_ENV');
    expect(() => readApplicationEnvironment({ DATABASE_URL: '' })).toThrow('DATABASE_URL');
  });

  it('does not expose rejected values in validation errors', () => {
    expect(() =>
      readApplicationEnvironment({ DATABASE_URL: 'https://secret:password@host' }),
    ).toThrow('DATABASE_URL must identify a local SQLite file without query parameters.');
  });
});
