interface SessionFlowAnswer {
  readonly stepIdentifier: string;
  readonly answer: TextOrNumber | ReadonlyList<string>;
}

interface SessionFlowCase {
  readonly name: string;
  readonly variant: 'A' | 'B';
  readonly answers: ReadonlyList<SessionFlowAnswer>;
  readonly expectedResultIdentifier: string;
  readonly expectedTotal: number;
}

export const SessionFlowCases = {
  BranchReturnSteps: ['office_days', 'timezone_span', 'priorities', 'work_mode'],
  Complete: [
    {
      name: 'variant A remote branch',
      variant: 'A',
      answers: [
        { stepIdentifier: 'team_size', answer: 10 },
        { stepIdentifier: 'work_mode', answer: 'remote' },
        { stepIdentifier: 'priorities', answer: ['focus'] },
        { stepIdentifier: 'timezone_span', answer: 'global' },
        { stepIdentifier: 'async_maturity', answer: 'high' },
        { stepIdentifier: 'tool_count', answer: 3 },
      ],
      expectedResultIdentifier: 'async_native',
      expectedTotal: 6,
    },
    {
      name: 'variant B office branch',
      variant: 'B',
      answers: [
        { stepIdentifier: 'work_mode', answer: 'hybrid' },
        { stepIdentifier: 'timezone_span', answer: 'same' },
        { stepIdentifier: 'team_size', answer: 10 },
        { stepIdentifier: 'async_maturity', answer: 'medium' },
        { stepIdentifier: 'priorities', answer: ['speed'] },
        { stepIdentifier: 'office_days', answer: 2 },
        { stepIdentifier: 'tool_count', answer: 4 },
      ],
      expectedResultIdentifier: 'hybrid_structured',
      expectedTotal: 7,
    },
  ] satisfies ReadonlyList<SessionFlowCase>,
} as const;
