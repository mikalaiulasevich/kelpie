import 'dotenv/config';
import { ApplicationPolicy } from './application/application-policy.js';
import { ApplicationMessages } from './application/application-messages.js';
import { ApplicationFactory } from './application/create-application.js';
import { ApplicationEnvironmentService } from './environment/application-environment.js';

try {
  const application = await ApplicationFactory.create();
  const environment = application.get(ApplicationEnvironmentService).values;
  await application.listen(environment.port, environment.host);
} catch {
  // Startup failures may contain connection strings. Never print the raw error.
  process.stderr.write(`${ApplicationMessages.StartupFailed}\n`);
  process.exitCode = ApplicationPolicy.FailureExitCode;
}
