export const configurationLimits = {
  maximumDocumentBytes: 262144,
  maximumDepth: 24,
  maximumNodes: 20000,
  maximumIssues: 30,
} as const;

// Conservative accounting bounds work before JSON Schema validation is allowed to run.
export const DocumentAccountingPolicy = {
  BytesPerCharacter: 3,
  PropertyOverheadBytes: 8,
  // The shared rejection list must remain stable across validation calls.
  ReservedKeys: Object.freeze(['__proto__', 'constructor', 'prototype']),
} as const;

export const ConfigurationSchemaPolicy = {
  TotalExperimentWeight: 100,
  RequiredResultSteps: 1,
  Identifier: { minLength: 1, maxLength: 100, pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$' },
  Text: { minLength: 1, maxLength: 4000 },
  MaximumDictionaryEntries: 100,
  MaximumIdentifierListItems: 100,
  VariantWeight: { minimum: 0, maximum: 100 },
  StepSequence: { minItems: 6, maxItems: 100, uniqueItems: true },
  SessionLifetimeHours: { minimum: 1, maximum: 8760 },
  ExcludedStepTypes: { maxItems: 5, uniqueItems: true },
  EventDeclarations: { minItems: 7, maxItems: 50 },
  Version: { minimum: 1, maximum: 2147483647 },
  Locale: { minLength: 2, maxLength: 35 },
  ResultRules: { maxItems: 100 },
  MinimumSelections: { minimum: 0, maximum: 100 },
  MaximumSelections: { minimum: 1, maximum: 100 },
  SelectionOptions: { minItems: 1, maxItems: 100 },
  ConditionText: { maxLength: 100 },
  ConditionValues: { minItems: 1, maxItems: 100, uniqueItems: true },
  ConditionChildren: { minItems: 1, maxItems: 30 },
  Recommendations: { minItems: 1, maxItems: 30 },
} as const;
