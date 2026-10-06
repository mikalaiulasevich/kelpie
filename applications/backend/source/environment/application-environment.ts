import { Inject, Injectable } from '@nestjs/common';
import type { ApplicationEnvironment } from './read-application-environment.js';

export const EnvironmentInjection = {
  Values: Symbol('ApplicationEnvironment'),
} as const;

@Injectable()
export class ApplicationEnvironmentService {
  constructor(@Inject(EnvironmentInjection.Values) readonly values: ApplicationEnvironment) {}
}
