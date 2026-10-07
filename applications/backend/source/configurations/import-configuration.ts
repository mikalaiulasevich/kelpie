import 'dotenv/config';
import { ConfigurationImportCommand } from './configuration-import-command.js';
import { ConfigurationCommandPolicy } from './configuration-command-policy.js';
import { ConfigurationCommandDiagnostics } from './configuration-command-diagnostics.js';

try {
  await ConfigurationImportCommand.run(
    process.argv.slice(ConfigurationCommandPolicy.ArgumentOffset),
  );
} catch (error) {
  ConfigurationCommandDiagnostics.report(error);
  process.exitCode = ConfigurationCommandPolicy.FailureExitCode;
}
