import { Injectable } from '@nestjs/common';
import { ApplicationEnvironmentReader } from './read-application-environment.js';

@Injectable()
export class ApplicationEnvironmentService {
  readonly values = ApplicationEnvironmentReader.read(process.env);
}
