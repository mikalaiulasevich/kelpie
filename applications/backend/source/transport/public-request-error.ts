import { HttpException } from '@nestjs/common';
import type { ConfigurationIssue } from '@kelpie/contracts';

export class PublicRequestError extends HttpException {
  constructor(
    status: number,
    readonly code: string,
    message: string,
    readonly issues?: ReadonlyList<ConfigurationIssue>,
  ) {
    super(message, status);
  }
}
