import { DatabaseBackupCommand } from './database-backup-command.js';
import { DatabaseBackupMessages } from './database-backup-messages.js';

try {
  await DatabaseBackupCommand.run(process.argv.slice(2), false);
} catch {
  process.stderr.write(`${DatabaseBackupMessages.Failed}\n`);
  process.exitCode = 1;
}
