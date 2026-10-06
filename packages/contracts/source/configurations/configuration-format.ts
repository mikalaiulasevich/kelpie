/** Stable values in the supplied JSON format, independent of a published funnel version. */
export const ConfigurationFormat = {
  SchemaVersion: '1.0',
  SchemaIdentifier: 'https://kelpie.local/schemas/funnel-1.0',
  ConditionDefinition: 'condition',
  ConditionReference: '#/$defs/condition',
  ExperimentAssignment: 'server',
  ResultSource: 'resultRules',
} as const;
