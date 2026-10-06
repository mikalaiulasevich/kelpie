export const configurationLimits = Object.freeze({
  maximumDocumentBytes: 262144,
  maximumDepth: 24,
  maximumNodes: 20000,
  maximumIssues: 30,
});

// Conservative accounting bounds work before JSON Schema validation is allowed to run.
export const DocumentAccountingPolicy = Object.freeze({
  bytesPerCharacter: 3,
  propertyOverheadBytes: 8,
  reservedKeys: Object.freeze(['__proto__', 'constructor', 'prototype']),
});

export const ConfigurationSchemaPolicy = Object.freeze({
  totalExperimentWeight: 100,
  requiredResultSteps: 1,
  identifier: Object.freeze({ minLength: 1, maxLength: 100, pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$' }),
  text: Object.freeze({ minLength: 1, maxLength: 4000 }),
  maximumDictionaryEntries: 100,
  maximumIdentifierListItems: 100,
  variantWeight: Object.freeze({ minimum: 0, maximum: 100 }),
  stepSequence: Object.freeze({ minItems: 6, maxItems: 100, uniqueItems: true }),
  sessionLifetimeHours: Object.freeze({ minimum: 1, maximum: 8760 }),
  excludedStepTypes: Object.freeze({ maxItems: 5, uniqueItems: true }),
  eventDeclarations: Object.freeze({ minItems: 7, maxItems: 50 }),
  version: Object.freeze({ minimum: 1, maximum: 2147483647 }),
  locale: Object.freeze({ minLength: 2, maxLength: 35 }),
  resultRules: Object.freeze({ maxItems: 100 }),
  minimumSelections: Object.freeze({ minimum: 0, maximum: 100 }),
  maximumSelections: Object.freeze({ minimum: 1, maximum: 100 }),
  selectionOptions: Object.freeze({ minItems: 1, maxItems: 100 }),
  conditionText: Object.freeze({ maxLength: 100 }),
  conditionValues: Object.freeze({ minItems: 1, maxItems: 100, uniqueItems: true }),
  conditionChildren: Object.freeze({ minItems: 1, maxItems: 30 }),
  recommendations: Object.freeze({ minItems: 1, maxItems: 30 }),
});
