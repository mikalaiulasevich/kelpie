const RestoreStatuses = {
  Conflict: 409,
  Unauthorized: 401,
  Gone: 410,
} as const;

export const QuizSessionPolicy = {
  ConflictStatus: RestoreStatuses.Conflict,
  UnauthorizedStatus: RestoreStatuses.Unauthorized,
  GoneStatus: RestoreStatuses.Gone,
  ServerFailureStatus: 500,
  RestoreStatuses: Object.values(RestoreStatuses),
  SessionLockName: 'kelpie.quiz.session',
  Current: '/api/sessions/current',
  Create: '/api/sessions',
  Events: '/api/events/batches',
  TimeoutMilliseconds: 15000,
  QueueLimit: 200,
  BatchLimit: 30,
  QueueBytes: 100000,
  RetryMilliseconds: 2000,
  MaximumRetryMilliseconds: 60000,
  MaximumRetryAttempts: 10,
  RetryJitter: 0.25,
  StoragePrefix: 'kelpie.quiz.',
} as const;
