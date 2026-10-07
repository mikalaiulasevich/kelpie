import { Localization } from '../localization/localization';

export const PublicationHistoryContent = {
  Published: 'Published',
  RolledBack: 'Rolled back',

  versionLink(identifier: string): string {
    return Localization.translate('View version {identifier}', { identifier });
  },
} as const;
