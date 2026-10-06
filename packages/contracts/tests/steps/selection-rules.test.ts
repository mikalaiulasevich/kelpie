import { describe, expect, it } from 'vitest';
import { StepRules, StepType } from '../../source/index.js';
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

  it('excludes informational and result steps from interactive rules', () => {
    const multipleSelection = SelectionFixtures.selectionStep({ required: true, messages: {} });
    expect(StepRules.isInteractive(multipleSelection)).toBe(true);
    expect(StepRules.isInteractive({ ...multipleSelection, type: StepType.SingleSelect })).toBe(
      true,
    );
    expect(
      StepRules.isInteractive({
        id: 'age',
        type: StepType.Number,
        content: {},
        input: { name: 'age', min: 0, max: 100, step: 1 },
        validation: { required: true, messages: {} },
      }),
    ).toBe(true);
    expect(StepRules.isInteractive({ id: 'intro', type: StepType.Information, content: {} })).toBe(
      false,
    );
    expect(
      StepRules.isInteractive({
        id: 'result',
        type: StepType.Result,
        content: {},
        resultSource: 'resultRules',
      }),
    ).toBe(false);
  });
});
