export const ApplicationMessages = {
  DirectoryUnavailable: 'Cannot locate the backend application directory.',
  ShutdownFailed: 'Backend resources could not be released after startup failure.',
  StartupFailed: 'Backend startup failed. Check environment and database migrations.',
  InitializationCleanupFailed: 'Application setup failed and its resources could not be released.',
} as const;
