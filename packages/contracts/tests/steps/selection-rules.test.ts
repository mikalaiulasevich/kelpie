import { describe, expect, it } from 'vitest';

import { StepRules } from '../../source/index.js';
import { SelectionCases } from '../cases/selection-cases.js';
import { SelectionFixtures } from '../fixtures/selection-fixtures.js';

describe('shared selection rules', () => {
  it.each(SelectionCases.limits)(
    'resolves selection limits for $name',
    ({ validation, expected }) => {
      expect(StepRules.selectionLimits(SelectionFixtures.selectionStep(validation))).toEqual(
        expected,
      );
    },
  );

  it('uses the distinct available choice count when validating duplicate options', () => {
    expect(
      StepRules.selectionLimits(
        SelectionFixtures.selectionStep({ required: true, messages: {} }),
        1,
      ),
    ).toEqual({
      minimum: 1,
      maximum: 1,
    });
  });

  it.each(SelectionCases.interactivity)(
    'classifies $name interactivity',
    ({ step, interactive }) => {
      expect(StepRules.isInteractive(step)).toBe(interactive);
    },
  );
});
