/** Stable values in the supplied JSON format, independent of a published funnel version. */
export const ConfigurationFormat = {
  schemaVersion: '1.0',
  schemaIdentifier: 'https://kelpie.local/schemas/funnel-1.0',
  conditionDefinition: 'condition',
  conditionReference: '#/$defs/condition',
  experimentAssignment: 'server',
  resultSource: 'resultRules',
} as const;
