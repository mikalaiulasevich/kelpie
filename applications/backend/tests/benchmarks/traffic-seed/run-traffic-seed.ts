import { TrafficSeedCommand } from './traffic-seed-command.js';
import { TrafficSeedMessages } from './traffic-seed-messages.js';

try {
  await TrafficSeedCommand.run(TrafficSeedCommand.options());
} catch {
  // Driver errors can carry connection details; the CLI never prints credentials or raw errors.
  process.stderr.write(`${TrafficSeedMessages.Failed}\n`);
  process.exitCode = 1;
}
