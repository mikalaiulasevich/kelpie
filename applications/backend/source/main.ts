import 'dotenv/config';
import { ApplicationMessages } from './application-messages.js';
import { createApplication } from './create-application.js';
import { ApplicationEnvironmentService } from './environment/application-environment.js';

try {
  const application = await createApplication();
  const environment = application.get(ApplicationEnvironmentService).values;
  await application.listen(environment.port, environment.host);
} catch {
  // Startup failures may contain connection strings. Never print the raw error.
  process.stderr.write(`${ApplicationMessages.StartupFailed}\n`);
  process.exitCode = 1;
}
