export const PublicationHistoryContent = {
  Published: 'Published',
  RolledBack: 'Rolled back',

  versionLink(identifier: string): string {
    return `View version ${identifier}`;
  },
} as const;
