export const configurationLimits = {
  maximumDocumentBytes: 262144,
  maximumDepth: 24,
  maximumNodes: 20000,
  maximumIssues: 30,
} as const;

// Conservative accounting bounds work before JSON Schema validation is allowed to run.
export const DocumentAccountingPolicy = {
  bytesPerCharacter: 3,
  propertyOverheadBytes: 8,
  reservedKeys: Object.freeze(['__proto__', 'constructor', 'prototype']),
} as const;

export const ConfigurationSchemaPolicy = {
  totalExperimentWeight: 100,
  requiredResultSteps: 1,
  identifier: { minLength: 1, maxLength: 100, pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$' },
  text: { minLength: 1, maxLength: 4000 },
  maximumDictionaryEntries: 100,
  maximumIdentifierListItems: 100,
  variantWeight: { minimum: 0, maximum: 100 },
  stepSequence: { minItems: 6, maxItems: 100, uniqueItems: true },
  sessionLifetimeHours: { minimum: 1, maximum: 8760 },
  excludedStepTypes: { maxItems: 5, uniqueItems: true },
  eventDeclarations: { minItems: 7, maxItems: 50 },
  version: { minimum: 1, maximum: 2147483647 },
  locale: { minLength: 2, maxLength: 35 },
  resultRules: { maxItems: 100 },
  minimumSelections: { minimum: 0, maximum: 100 },
  maximumSelections: { minimum: 1, maximum: 100 },
  selectionOptions: { minItems: 1, maxItems: 100 },
  conditionText: { maxLength: 100 },
  conditionValues: { minItems: 1, maxItems: 100, uniqueItems: true },
  conditionChildren: { minItems: 1, maxItems: 30 },
  recommendations: { minItems: 1, maxItems: 30 },
} as const;
