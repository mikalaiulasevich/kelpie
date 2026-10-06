export const AnswerMessages = {
  FiniteNumberRequired: 'Enter a finite number.',
  AvailableOptionRequired: 'Select an available option.',
  AvailableOptionsRequired: 'Select available options.',
  UniqueSelectionsRequired: 'Selections must be unique.',
  TooManySelections: 'Too many selections.',
  NonInteractiveStep: 'This step does not accept answers.',
  RequiredAnswer: 'An answer is required.',
  MinimumNumber: (minimum: number): string => `Enter at least ${minimum}.`,
  MaximumNumber: (maximum: number): string => `Enter no more than ${maximum}.`,
  NumericIncrement: (increment: number): string => `Use increments of ${increment}.`,
  MinimumSelections: (minimum: number): string => `Choose at least ${minimum} options.`,
} as const;
