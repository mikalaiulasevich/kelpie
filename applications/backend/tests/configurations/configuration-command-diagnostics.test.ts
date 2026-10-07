import { describe, expect, it } from 'vitest';
import { ConfigurationCommandDiagnostics } from '../../source/configurations/configuration-command-diagnostics.js';
import { ConfigurationImportError } from '../../source/configurations/configuration-import-error.js';
import { ConfigurationImportErrorCode } from '../../source/configurations/configuration-import-types.js';
import { DiagnosticFixtures } from '../fixtures/diagnostic-errors.js';

const usageMessage = 'Provide exactly one local JSON configuration file.';

describe('configuration command diagnostics', () => {
  it('keeps an exact command message', () => {
    const description = ConfigurationCommandDiagnostics.describe(new Error(usageMessage));

    expect(description.message).toBe(usageMessage);
  });

  it('does not admit extra user content appended to a known message', () => {
    const description = ConfigurationCommandDiagnostics.describe(
      new Error(`${usageMessage} private-file-path`),
    );

    expect(description.message).toBe('Configuration import failed.');
    expect(JSON.stringify(description)).not.toContain('private-file-path');
  });

  it('retains domain conflict details without using arbitrary error text', () => {
    const error = new ConfigurationImportError(ConfigurationImportErrorCode.Conflict);
    error.message = 'private input';

    expect(ConfigurationCommandDiagnostics.describe(error)).toEqual({
      message: 'Configuration import failed.',
      details: { code: 'conflict', issues: [] },
    });
  });

  it('handles a non-error thrown value without echoing its contents', () => {
    const description = ConfigurationCommandDiagnostics.describe({ message: 'private input' });

    expect(description).toMatchObject({
      message: 'Configuration import failed.',
      details: { classification: 'unknown' },
    });
    expect(JSON.stringify(description)).not.toContain('private input');
  });

  it('contains a throwing message accessor', () => {
    const description = ConfigurationCommandDiagnostics.describe(
      DiagnosticFixtures.unreadableMessage(),
    );

    expect(description).toMatchObject({
      message: 'Configuration import failed.',
      details: { classification: 'unknown' },
    });
    expect(JSON.stringify(description)).not.toContain('private accessor');
  });
});
