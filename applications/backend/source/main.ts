import 'dotenv/config';
import { createApplication } from './create_application.js';
import { ApplicationEnvironmentService } from './environment/application_environment.js';

try {
  const application = await createApplication();
  const environment = application.get(ApplicationEnvironmentService).values;
  await application.listen(environment.port, environment.host);
} catch {
  // Startup failures may contain connection strings. Never print the raw error.
  process.stderr.write('Backend startup failed. Check environment and database migrations.\n');
  process.exitCode = 1;
}
