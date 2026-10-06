import { Injectable } from '@nestjs/common';
import { readApplicationEnvironment } from './read-application-environment.js';

export { readApplicationEnvironment } from './read-application-environment.js';

@Injectable()
export class ApplicationEnvironmentService {
  readonly values = readApplicationEnvironment(process.env);
}
