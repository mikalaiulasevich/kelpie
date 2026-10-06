import type { AnswerIssueCode } from '../../source/index.js';

interface SelectionCase {
  readonly description: string;
  readonly answer: unknown;
  readonly expectedCodes: ReadonlyList<AnswerIssueCode>;
}

export const AnswerCases = {
  selections: [
    { description: 'rejects nontext values', answer: ['focus', 1], expectedCodes: ['type'] },
    {
      description: 'rejects duplicate selections',
      answer: ['focus', 'focus'],
      expectedCodes: ['duplicate'],
    },
    { description: 'rejects unknown options', answer: ['unknown'], expectedCodes: ['option'] },
    {
      description: 'requires the minimum selection count',
      answer: [],
      expectedCodes: ['minSelections'],
    },
    {
      description: 'enforces the maximum selection count',
      answer: ['focus', 'speed', 'cost'],
      expectedCodes: ['maxSelections'],
    },
    {
      description: 'bounds the array before inspecting options',
      answer: ['focus', 'speed', 'cost', 'unknown'],
      expectedCodes: ['type'],
    },
  ] satisfies ReadonlyList<SelectionCase>,

  missing: [
    { description: 'undefined', answer: undefined },
    { description: 'null', answer: null },
    { description: 'empty string', answer: '' },
  ],

  presentNonNumeric: [
    { description: 'false', answer: false },
    { description: 'NaN', answer: NaN },
    { description: 'bigint', answer: 1n },
    { description: 'symbol', answer: Symbol('answer') },
    { description: 'empty array', answer: [] },
    { description: 'whitespace', answer: ' ' },
  ],

  invalidNumbers: [
    { description: 'NaN', answer: NaN },
    { description: 'infinity', answer: Infinity },
    { description: 'numeric text', answer: '10' },
    { description: 'below minimum', answer: 0 },
    { description: 'above maximum', answer: 201 },
    { description: 'fractional team size', answer: 1.5 },
  ],

  invalidPriorities: [
    { description: 'empty selection', answer: [] },
    { description: 'duplicate priority', answer: ['focus', 'focus'] },
    { description: 'unknown priority', answer: ['unknown'] },
    { description: 'too many priorities', answer: ['focus', 'speed', 'culture', 'cost'] },
  ],
} as const;
