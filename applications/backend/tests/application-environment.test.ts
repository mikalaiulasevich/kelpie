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
