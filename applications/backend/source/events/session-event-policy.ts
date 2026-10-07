export const SessionTransitionKind = {
  Forward: 'forward',
  Back: 'back',
  RouteCorrection: 'route_correction',
} as const;

export type SessionTransitionKind = ValueOf<typeof SessionTransitionKind>;

export const SessionEventName = {
  Started: 'session_started',
  AnswerSubmitted: 'answer_submitted',
  StepCompleted: 'step_completed',
  BackClicked: 'back_clicked',
} as const;

export const SessionEventPolicy = {
  Source: 'server',
  HashAlgorithm: 'sha256',
  HashEncoding: 'hex',
} as const;
