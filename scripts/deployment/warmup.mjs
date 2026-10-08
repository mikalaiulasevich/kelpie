import { WarmupMessages } from './warmup-messages.mjs';
import { WarmupOperations } from './warmup-operations.mjs';
import { WarmupPolicy } from './warmup-policy.mjs';

try {
  await WarmupOperations.run(process.env[WarmupPolicy.OriginEnvironment]);
  console.info(WarmupMessages.Passed);
} catch {
  // Do not print fetch errors: URLs, query parameters or infrastructure details can leak.
  console.error(WarmupMessages.Failed);
  process.exitCode = 1;
}
