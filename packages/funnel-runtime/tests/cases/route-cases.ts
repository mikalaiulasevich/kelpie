import { StepType } from '@kelpie/contracts';

export const RouteCases = {
  progressExclusions: [
    {
      description: 'no excluded types',
      excludedTypes: [],
      questionCount: 8,
      completedQuestionCount: 6,
    },
    {
      description: 'all five types excluded',
      excludedTypes: [
        StepType.Information,
        StepType.Result,
        StepType.Number,
        StepType.SingleSelect,
        StepType.MultiSelect,
      ],
      questionCount: 0,
      completedQuestionCount: 0,
    },
  ],
} as const;
