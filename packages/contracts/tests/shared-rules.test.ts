import { describe, expect, it } from 'vitest';
import {
  StepRules,
  DictionaryAccess,
  StepType,
  type AnswerValidation,
  type SelectionStep,
} from '../source/index.js';

const SelectionFixtures = {
  selectionStep(validation: AnswerValidation): SelectionStep {
    return {
      id: 'preferences',
      type: StepType.MultiSelect,
      content: { title: 'Preferences' },
      input: {
        name: 'preferences',
        options: [
          { value: 'first', label: 'First' },
          { value: 'second', label: 'Second' },
        ],
      },
      validation,
    };
  },
} as const;

describe('own dictionary properties', () => {
  it('does not resolve inherited properties or missing entries', () => {
    const dictionary = { present: 'value' };

    expect(DictionaryAccess.readOwn(dictionary, 'present')).toBe('value');
    expect(DictionaryAccess.readOwn(dictionary, 'missing')).toBeUndefined();
    expect(DictionaryAccess.readOwn(dictionary, 'constructor')).toBeUndefined();
    expect(DictionaryAccess.readOwn(dictionary, 'toString')).toBeUndefined();
    expect(DictionaryAccess.readOwn(dictionary, '__proto__')).toBeUndefined();
  });

  it('supports null prototypes and own keys that shadow prototype names', () => {
    const dictionary: Record<string, string | undefined> = {
      constructor: 'own constructor',
      hasOwnProperty: 'own value',
      missingValue: undefined,
    };
    Object.setPrototypeOf(dictionary, null);

    expect(DictionaryAccess.readOwn(dictionary, 'constructor')).toBe('own constructor');
    expect(DictionaryAccess.readOwn(dictionary, 'hasOwnProperty')).toBe('own value');
    expect(DictionaryAccess.readOwn(dictionary, 'missingValue')).toBeUndefined();
  });
});

describe('shared selection rules', () => {
  it('defaults required and optional limits while preserving explicit zero', () => {
    expect(
      StepRules.selectionLimits(SelectionFixtures.selectionStep({ required: true, messages: {} })),
    ).toEqual({
      minimum: 1,
      maximum: 2,
    });
    expect(
      StepRules.selectionLimits(SelectionFixtures.selectionStep({ required: false, messages: {} })),
    ).toEqual({
      minimum: 0,
      maximum: 2,
    });
    expect(
      StepRules.selectionLimits(
        SelectionFixtures.selectionStep({
          required: true,
          minSelections: 0,
          maxSelections: 1,
          messages: {},
        }),
      ),
    ).toEqual({ minimum: 0, maximum: 1 });
  });

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
