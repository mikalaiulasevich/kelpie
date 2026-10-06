import { Inject, Injectable } from '@nestjs/common';
import type { ApplicationEnvironment } from './environment-schemas.js';

export const EnvironmentInjection = {
  Values: Symbol('ApplicationEnvironment'),
} as const;

@Injectable()
export class ApplicationEnvironmentService {
  constructor(@Inject(EnvironmentInjection.Values) readonly values: ApplicationEnvironment) {}
}
