import { TrafficSeedCommand } from './traffic-seed-command.js';
import { TrafficSeedMessages } from './traffic-seed-messages.js';
import { TrafficSeedImportMessages } from './traffic-seed-import-messages.js';
import { TrafficSeedTransportMessages } from './traffic-seed-transport-messages.js';
import { isError } from 'es-toolkit/predicate';

try {
  await TrafficSeedCommand.run(TrafficSeedCommand.options());
} catch (error) {
  // Driver errors can carry connection details; the CLI never prints credentials or raw errors.
  const message = isError(error)
    ? [
        ...Object.values(TrafficSeedMessages),
        ...Object.values(TrafficSeedImportMessages),
        ...Object.values(TrafficSeedTransportMessages),
      ].find((candidate) => error.message.startsWith(candidate))
    : undefined;
  process.stderr.write(`${message ?? TrafficSeedMessages.Failed}\n`);
  process.exitCode = 1;
}
