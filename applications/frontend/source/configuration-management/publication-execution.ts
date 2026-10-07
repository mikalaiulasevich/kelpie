import { ManagementClient } from '../management/management-client';
import { PublicationIntents, type PublicationIntent } from './publication-intents';

export const PublicationExecution = {
  async apply(
    ownerIdentifier: string,
    intent: PublicationIntent,
    signal: AbortSignal,
  ): Promise<boolean> {
    signal.throwIfAborted();
    PublicationIntents.save(ownerIdentifier, intent);

    if (intent.kind === 'publish') {
      await ManagementClient.publish(intent.command, signal);
    } else {
      await ManagementClient.rollback(intent.command, signal);
    }

    signal.throwIfAborted();

    return PublicationIntents.clear(ownerIdentifier);
  },
} as const;
