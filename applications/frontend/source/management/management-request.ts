import type { ValidateFunction } from 'ajv';
import type { AnalyticsQuery, ManagementQuery } from './management-types';

/** Transport-only contract; schemas validate the untrusted response body. */
export type ManagementRequest<Result> = Readonly<{
  path: string;
  signal: AbortSignal;
  validate: ValidateFunction<Result>;
}> &
  (
    | Readonly<{ method: 'GET'; query?: ManagementQuery | AnalyticsQuery }>
    | Readonly<{ method: 'POST'; document: unknown }>
  );
