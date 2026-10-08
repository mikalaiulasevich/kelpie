import { DatabaseBackupCommand } from './database-backup-command.js';
import { DatabaseBackupMessages } from './database-backup-messages.js';

try {
  await DatabaseBackupCommand.run(process.argv.slice(2), false);
} catch (error) {
  process.stderr.write(`${DatabaseBackupMessages.failure(error)}\n`);
  process.exitCode = 1;
}
