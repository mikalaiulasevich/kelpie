export const ConfigurationMessages = {
  ImportFailure: 'Could not complete import',
  CommandFailure: 'Change not confirmed',
  UnknownOutcome: 'We could not confirm the change. Retry to check the same request safely.',
  Conflict:
    'This funnel has changed since you opened this dialog. Refresh to review the current revision.',
  StorageFailure:
    'Your browser could not save this operation for a safe retry. This attempt was not sent.',
  RecoveryRetained:
    'Your browser could not clear the saved request. If you reload and retry, the same request will be reused safely.',
  ReadFailure: 'Unable to read the selected file.',
  InvalidJson: 'Choose a valid JSON configuration file.',
  FileTooLarge: 'The file is larger than the 256 KiB request limit.',
} as const;
