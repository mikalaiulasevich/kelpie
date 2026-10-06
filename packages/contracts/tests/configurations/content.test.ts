import { describe, expect, it } from 'vitest';
import { FunnelConfigurations } from '../../source/index.js';
import { ConfigurationFixtures } from '../fixtures/configuration-fixtures.js';
import { ConfigurationCases } from '../cases/configuration-cases.js';

describe('content', () => {
  it.each(ConfigurationCases.blankInformationContent)(
    'rejects blank information content $field with $name in base and merged variants',
    ({ field, value }) => {
      const configuration = ConfigurationFixtures.valid();
      const intro = ConfigurationFixtures.informationStep(configuration);

      expect(
        FunnelConfigurations.validate({
          ...configuration,
          steps: {
            ...configuration.steps,
            intro: { ...intro, content: { ...intro.content, [field]: value } },
          },
        }),
      ).toMatchObject({ valid: false });

      const overridden = FunnelConfigurations.validate(
        ConfigurationFixtures.withVariantIntroductionContent({ [field]: value }),
      );

      expect(overridden).toMatchObject({ valid: false });
      expect(
        overridden.issues.some((issue) => issue.path.includes('stepOverrides/intro/content')),
      ).toBe(true);
    },
  );

  it('accepts partial content overrides without trimming or mutating the configuration', () => {
    const document = ConfigurationFixtures.withVariantIntroductionContent({
      title: '  New title  ',
    });
    const before = JSON.stringify(document);

    expect(FunnelConfigurations.validate(document).valid).toBe(true);
    expect(JSON.stringify(document)).toBe(before);
  });

  it('validates merged variant content instead of only the base step', () => {
    const document = ConfigurationFixtures.withVariantIntroductionContent({ title: ' ' });
    const result = FunnelConfigurations.validate(document);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path.includes('stepOverrides'))).toBe(true);
  });
});
