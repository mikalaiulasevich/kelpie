export const SessionHttpPolicy = {
  Route: 'sessions',
  CurrentRoute: 'current',
  AnswersRoute: 'current/answers',
  ContinueRoute: 'current/continue',
  BackRoute: 'current/back',
  ReadRateLimit: { max: 120, timeWindow: 60_000 },
  CreateRateLimit: { max: 30, timeWindow: 60_000 },
  CommandRateLimit: { max: 120, timeWindow: 60_000, groupId: 'session-commands' },
} as const;
