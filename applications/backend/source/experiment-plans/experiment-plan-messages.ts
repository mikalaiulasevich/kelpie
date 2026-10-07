export const ExperimentPlanMessages = {
  Invalid: 'The experiment plan is invalid.',
  Missing: 'The configuration version does not exist.',
  EndDate: 'The planned end must be a valid future UTC timestamp.',
  Locked:
    'A recorded experiment plan is immutable. Import a new version to register a different plan.',
} as const;
