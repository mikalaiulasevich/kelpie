import { describe, expect, it } from 'vitest';
import { ExperimentVariant, type FunnelConfiguration } from '@kelpie/contracts';
import { ExperimentResolution, ResultResolution } from '../../source/index.js';
import { RuntimeFixtures, RuntimeAnswers } from '../fixtures/runtime-fixtures.js';

describe('experiments', () => {
  it.each([
    { version: 1, variant: ExperimentVariant.A },
    { version: 1, variant: ExperimentVariant.B },
    { version: 2, variant: ExperimentVariant.A },
    { version: 2, variant: ExperimentVariant.B },
    { version: 3, variant: ExperimentVariant.A },
    { version: 3, variant: ExperimentVariant.B },
  ])(
    'keeps result overrides consistent in version $version variant $variant',
    ({ version, variant }) => {
      const document = RuntimeFixtures.configuration(version);
      const originalDocument = structuredClone(document);
      const result = ResultResolution.resolve(document, variant, RuntimeAnswers.complete());
      const resolved = ExperimentResolution.resolve(document, variant);

      expect(result).toBeDefined();
      expect(result?.id).toBe('balanced');
      expect(result).toEqual(resolved.results['balanced']);
      expect(document).toEqual(originalDocument);
    },
  );

  it('ignores inherited result overrides in both resolvers', () => {
    const document = RuntimeFixtures.configuration(1);
    const resultOverrides = {};
    Object.setPrototypeOf(resultOverrides, { balanced: { title: 'Inherited title' } });

    const inheritedDocument: FunnelConfiguration = {
      ...document,
      experiment: {
        ...document.experiment,
        variants: {
          ...document.experiment.variants,
          B: { ...document.experiment.variants.B, resultOverrides },
        },
      },
    };

    expect(
      ResultResolution.resolve(inheritedDocument, ExperimentVariant.B, RuntimeAnswers.complete()),
    ).toEqual(document.results['balanced']);
    expect(
      ExperimentResolution.resolve(inheritedDocument, ExperimentVariant.B).results['balanced'],
    ).toEqual(document.results['balanced']);
  });

  it('resolves variant order and copy without changing the original document', () => {
    const document = RuntimeFixtures.configuration(1);
    const before = JSON.stringify(document);
    const resolved = ExperimentResolution.resolve(document, ExperimentVariant.B);
    expect(resolved.stepSequence[1]).toBe('work_mode');
    expect(resolved.steps['intro']?.content.primaryActionLabel).toBe('Show me');
    expect(JSON.stringify(document)).toBe(before);
  });
});
