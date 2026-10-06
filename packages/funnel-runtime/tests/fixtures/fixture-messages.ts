import type { ConfigurationIssue } from '@kelpie/contracts';

export const FixtureMessages = {
  MissingStep: (identifier: string): string => `Missing fixture step: ${identifier}`,
  InvalidConfiguration: (issues: ReadonlyList<ConfigurationIssue>): string =>
    JSON.stringify(issues),
} as const;
