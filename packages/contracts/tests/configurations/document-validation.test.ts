import { describe, expect, it } from 'vitest';

import { FunnelConfigurations } from '../../source/index.js';
import { ConfigurationFixtures } from '../fixtures/configuration-fixtures.js';
import { ConfigurationCases } from '../cases/configuration-cases.js';
import { DocumentFixtures } from '../fixtures/document-fixtures.js';

describe('document validation', () => {
  it.each(ConfigurationCases.preservedVersions)('accepts preserved version %s', (version) => {
    expect(FunnelConfigurations.validate(ConfigurationFixtures.original(version))).toMatchObject({
      valid: true,
    });
  });

  it('rejects prototype keys before schema validation', () => {
    expect(FunnelConfigurations.validate(JSON.parse('{"__proto__":{}}'))).toMatchObject({
      valid: false,
    });
  });

  it('bounds nesting and does not overflow the call stack', () => {
    const nested = DocumentFixtures.nested(1000);

    expect(FunnelConfigurations.validate(nested)).toMatchObject({ valid: false });
  });

  it('rejects circular input', () => {
    const circular = DocumentFixtures.circular();
    expect(FunnelConfigurations.validate(circular)).toMatchObject({ valid: false });
  });

  it('rejects inherited configuration fields', () => {
    const configuration = ConfigurationFixtures.valid();

    const inherited: unknown = Object.create(configuration);
    expect(FunnelConfigurations.validate(inherited)).toMatchObject({ valid: false });
  });

  it('rejects unknown fields instead of silently deleting them', () => {
    const document = ConfigurationFixtures.valid();
    expect(
      FunnelConfigurations.validate({
        ...document,
        executableScript: 'anything',
      }),
    ).toMatchObject({ valid: false });
  });
});
