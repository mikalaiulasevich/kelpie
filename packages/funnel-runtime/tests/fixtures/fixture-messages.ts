import type { ConfigurationIssue } from '@kelpie/contracts';

export const FixtureMessages = {
  UnexpectedAnswerRead: 'Short-circuited answers must not be inspected.',
  UnexpectedRuleRead: 'A later rule must not be evaluated after a match.',
  MissingStep: (identifier: string): string => `Missing fixture step: ${identifier}`,
  InvalidConfiguration: (issues: ReadonlyList<ConfigurationIssue>): string =>
    JSON.stringify(issues),
} as const;
