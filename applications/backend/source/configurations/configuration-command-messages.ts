export const ConfigurationCommandMessages = {
  Usage: 'Provide exactly one local JSON configuration file.',
  FileRequired: 'Configuration input must be a regular file within the document size limit.',
  InvalidJson: 'Configuration input must contain valid JSON.',
  DatabaseNotReady: 'Apply database migrations before importing configurations.',
  ImportFailed: 'Configuration import failed.',
  CleanupFailed: 'Configuration import failed and application cleanup also failed.',
} as const;
