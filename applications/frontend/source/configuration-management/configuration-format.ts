import { ConfigurationContent } from './configuration-content';

export const ConfigurationFormat = {
  version(version: number): string {
    return `v${version}`;
  },

  identifier(identifier: string): string {
    return `${identifier.slice(0, 8)}…`;
  },

  date(value: string): string {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  },

  action(action: string): string {
    return action === 'rollback' ? ConfigurationContent.RollbackAction : ConfigurationContent.Publication;
  },
} as const;
