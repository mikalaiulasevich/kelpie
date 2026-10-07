import { Localization } from '../localization/localization';
import type { ConfigurationList } from '../management/management-types';
import { ConfigurationContent } from './configuration-content';
import { ConfigurationManagementPolicy } from './configuration-policy';

export const ConfigurationFormat = {
  activeVersion(configurations: ConfigurationList): string {
    const active = configurations.items.find(
      (version) => version.identifier === configurations.funnel.activeVersionIdentifier,
    );

    if (active) {
      return this.version(active.version);
    }

    if (configurations.funnel.activeVersionIdentifier) {
      return this.identifier(configurations.funnel.activeVersionIdentifier);
    }

    return Localization.translate(ConfigurationContent.NoActiveVersion);
  },

  version(version: number): string {
    return `${ConfigurationManagementPolicy.DefaultVersionPrefix}${version}`;
  },

  identifier(identifier: string): string {
    return `${identifier.slice(0, ConfigurationManagementPolicy.IdentifierPreviewLength)}…`;
  },

  date(value: string): string {
    return ConfigurationFormat.timestamp(value, { dateStyle: 'medium', timeStyle: 'short' });
  },

  timestamp(value: string, options: Intl.DateTimeFormatOptions): string {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(Localization.formattingLocale, options).format(date);
  },

  action(action: string): string {
    return Localization.translate(
      action === 'rollback'
        ? ConfigurationContent.RollbackAction
        : ConfigurationContent.Publication,
    );
  },
} as const;
