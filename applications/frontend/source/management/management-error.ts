import type { ManagementIssue } from './management-types';

export class ManagementError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly issues: readonly ManagementIssue[] = [],
    readonly uncertain = false,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
