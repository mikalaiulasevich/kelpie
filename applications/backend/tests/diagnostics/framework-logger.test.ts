import { afterEach, describe, expect, it, vi } from 'vitest';
import { FrameworkLogger } from '../../source/diagnostics/framework-logger.js';
import { Diagnostics } from '../../source/diagnostics/diagnostics.js';
import { FrameworkLoggingCases } from '../cases/framework-logging-cases.js';

afterEach(() => vi.restoreAllMocks());

describe('safe framework logger', () => {
  it.each(FrameworkLoggingCases.Levels)(
    'maps $method to $severity and keeps only an allowlisted context',
    ({ method, severity }) => {
      const write = vi.spyOn(Diagnostics, 'write').mockImplementation(() => undefined);

      FrameworkLogger[method](
        'password=private-password',
        { answer: 'private-answer' },
        'at privateFunction (/private/path:123456:789)',
        'NestFactory',
      );

      expect(write).toHaveBeenCalledExactlyOnceWith(
        {
          event: 'framework_message',
          message: 'Framework diagnostic recorded.',
          context: 'NestFactory',
        },
        severity,
      );
    },
  );

  it.each(FrameworkLoggingCases.UntrustedMessages)(
    'discards arbitrary $name messages and unknown contexts',
    ({ message }) => {
      const write = vi.spyOn(Diagnostics, 'write').mockImplementation(() => undefined);

      FrameworkLogger.log(message, 'private-context');

      expect(write).toHaveBeenCalledExactlyOnceWith(
        { event: 'framework_message', message: 'Framework diagnostic recorded.' },
        'info',
      );
    },
  );

  it('uses safe Error diagnostics without reading the original stack', () => {
    const write = vi.spyOn(Diagnostics, 'write').mockImplementation(() => undefined);
    const error = new Error('password=private-password');
    const stack = vi.fn(() => 'at privateFunction (/private/path:123456:789)');
    Object.defineProperty(error, 'stack', { get: stack });

    FrameworkLogger.error(error, 'private-stack', 'ExceptionHandler');

    expect(stack).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        context: 'ExceptionHandler',
        error: expect.objectContaining({ classification: 'error', safeMessage: undefined }),
      }),
      'error',
    );
    expect(JSON.stringify(write.mock.calls)).not.toMatch(/private|password|123456/);
  });

  it('retains a generic record when even inspecting the message throws', () => {
    const write = vi.spyOn(Diagnostics, 'write').mockImplementation(() => undefined);
    const proxy = Proxy.revocable({}, {});
    proxy.revoke();

    expect(() => FrameworkLogger.error(proxy.proxy, 'ExceptionHandler')).not.toThrow();
    expect(write).toHaveBeenCalledExactlyOnceWith(
      {
        event: 'framework_message',
        message: 'Framework diagnostic recorded.',
        context: 'ExceptionHandler',
      },
      'error',
    );
  });
});
