import 'dotenv/config';
import { SessionStorageCompactionCommand } from './session-storage-compaction-command.js';
import { SessionStorageCompactionMessages } from './session-storage-compaction-messages.js';
import { SessionStorageCompactionPolicy } from './session-storage-compaction-policy.js';

try {
  await SessionStorageCompactionCommand.run();
} catch {
  process.stderr.write(`${SessionStorageCompactionMessages.Failed}\n`);
  process.exitCode = SessionStorageCompactionPolicy.FailureExitCode;
}
