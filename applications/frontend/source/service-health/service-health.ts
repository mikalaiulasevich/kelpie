export const ServiceHealthStatus = Object.freeze({
  Checking: 'checking',
  Ready: 'ready',
  Unavailable: 'unavailable',
} as const);

export type ServiceHealthStatus = (typeof ServiceHealthStatus)[keyof typeof ServiceHealthStatus];

export type CompletedServiceHealth =
  | Readonly<{ status: typeof ServiceHealthStatus.Ready; checkedAt: Date }>
  | Readonly<{ status: typeof ServiceHealthStatus.Unavailable }>;

export type ServiceHealth =
  Readonly<{ status: typeof ServiceHealthStatus.Checking }> | CompletedServiceHealth;

export interface CompletedServiceHealthCheck {
  readonly sequence: number;
  readonly health: CompletedServiceHealth;
}
