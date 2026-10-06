import type { ConfigurationIssue } from '../../source/index.js';

export const FixtureMessages = {
  InvalidConfiguration: (version: number, issues: ReadonlyList<ConfigurationIssue>): string =>
    `Invalid configuration fixture ${version}: ${JSON.stringify(issues)}`,
  InformationIntroductionRequired: 'Configuration fixture requires an information introduction.',
  NumericTeamSizeRequired: 'Configuration fixture requires numeric team size.',
} as const;
