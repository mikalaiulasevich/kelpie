import { Inject, Injectable } from '@nestjs/common';
import type { ApplicationEnvironment } from './environment-schemas.js';
import { EnvironmentInjection } from './environment-policy.js';

@Injectable()
export class ApplicationEnvironmentService {
  constructor(@Inject(EnvironmentInjection.Values) readonly values: ApplicationEnvironment) {}
}
