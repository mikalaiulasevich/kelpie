import { Injectable } from '@nestjs/common';
import { readApplicationEnvironment } from './read-application_environment.js';

export { readApplicationEnvironment } from './read-application_environment.js';

@Injectable()
export class ApplicationEnvironmentService {
  readonly values = readApplicationEnvironment(process.env);
}
