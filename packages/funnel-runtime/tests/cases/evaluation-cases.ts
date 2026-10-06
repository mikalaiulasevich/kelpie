export const EvaluationCases = {
  Completion: [
    {
      name: 'missing optional answer',
      required: false,
      teamSize: undefined,
      expectedActiveAnswer: undefined,
      completed: 5,
      hasResult: true,
    },
    {
      name: 'invalid optional answer',
      required: false,
      teamSize: -1,
      expectedActiveAnswer: undefined,
      completed: 5,
      hasResult: true,
    },
    {
      name: 'valid optional answer',
      required: false,
      teamSize: 10,
      expectedActiveAnswer: 10,
      completed: 6,
      hasResult: true,
    },
    {
      name: 'missing required answer',
      required: true,
      teamSize: undefined,
      expectedActiveAnswer: undefined,
      completed: 5,
      hasResult: false,
    },
    {
      name: 'invalid required answer',
      required: true,
      teamSize: -1,
      expectedActiveAnswer: undefined,
      completed: 5,
      hasResult: false,
    },
  ],
} as const;
