import { Type, type Static } from 'typebox';
import { HealthStatus } from './health-policy.js';

export const HealthResponseSchema = Type.Object({ status: Type.Enum(HealthStatus) });

export type HealthResponse = Readonly<Static<typeof HealthResponseSchema>>;
