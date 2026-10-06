import { describe, expect, it } from 'vitest';
import {
  StepRules,
  readOwnProperty,
  StepType,
  type AnswerValidation,
  type SelectionStep,
} from '../source/index.js';

function selectionStep(validation: AnswerValidation): SelectionStep {
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
}

describe('own dictionary properties', () => {
  it('does not resolve inherited properties or missing entries', () => {
    const dictionary = { present: 'value' };

    expect(readOwnProperty(dictionary, 'present')).toBe('value');
    expect(readOwnProperty(dictionary, 'missing')).toBeUndefined();
    expect(readOwnProperty(dictionary, 'constructor')).toBeUndefined();
    expect(readOwnProperty(dictionary, 'toString')).toBeUndefined();
    expect(readOwnProperty(dictionary, '__proto__')).toBeUndefined();
  });

  it('supports null prototypes and own keys that shadow prototype names', () => {
    const dictionary: Record<string, string | undefined> = {
      constructor: 'own constructor',
      hasOwnProperty: 'own value',
      missingValue: undefined,
    };
    Object.setPrototypeOf(dictionary, null);

    expect(readOwnProperty(dictionary, 'constructor')).toBe('own constructor');
    expect(readOwnProperty(dictionary, 'hasOwnProperty')).toBe('own value');
    expect(readOwnProperty(dictionary, 'missingValue')).toBeUndefined();
  });
});

describe('shared selection rules', () => {
  it('defaults required and optional limits while preserving explicit zero', () => {
    expect(StepRules.selectionLimits(selectionStep({ required: true, messages: {} }))).toEqual({
      minimum: 1,
      maximum: 2,
    });
    expect(StepRules.selectionLimits(selectionStep({ required: false, messages: {} }))).toEqual({
      minimum: 0,
      maximum: 2,
    });
    expect(
      StepRules.selectionLimits(
        selectionStep({ required: true, minSelections: 0, maxSelections: 1, messages: {} }),
      ),
    ).toEqual({ minimum: 0, maximum: 1 });
  });

  it('uses the distinct available choice count when validating duplicate options', () => {
    expect(StepRules.selectionLimits(selectionStep({ required: true, messages: {} }), 1)).toEqual({
      minimum: 1,
      maximum: 1,
    });
  });

  it('excludes informational and result steps from interactive rules', () => {
    const multipleSelection = selectionStep({ required: true, messages: {} });
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
