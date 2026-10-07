import { ConfigurationMessages } from './configuration-messages';
import { Ajv } from 'ajv';
import { Type, type Static } from 'typebox';
import { isNull } from 'es-toolkit/predicate';
import { ManagementSchemas } from '../management/management-types';
import type { ConfigurationVersionMetadata } from '../management/management-types';
import { ConfigurationFormat } from './configuration-format';
import { ConfigurationContent } from './configuration-content';

export const PublicationIntentSchema = Type.Union([
  Type.Object(
    {
      kind: Type.Literal('publish'),
      command: ManagementSchemas.PublishRequest,
      label: Type.String({ maxLength: 100 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal('rollback'),
      command: ManagementSchemas.RollbackRequest,
      label: Type.String({ maxLength: 100 }),
    },
    { additionalProperties: false },
  ),
]);

export type PublicationIntent = Readonly<Static<typeof PublicationIntentSchema>>;

const validateIntent = new Ajv().compile<PublicationIntent>(PublicationIntentSchema);

export const PublicationIntents = {
  publish(
    funnelIdentifier: string,
    version: ConfigurationVersionMetadata,
    expectedRevision: number,
  ): PublicationIntent {
    return {
      kind: 'publish',
      label: ConfigurationFormat.version(version.version),
      command: {
        operationIdentifier: globalThis.crypto.randomUUID(),
        funnelIdentifier,
        targetVersionIdentifier: version.identifier,
        expectedRevision,
      },
    };
  },

  rollback(funnelIdentifier: string, expectedRevision: number): PublicationIntent {
    return {
      kind: 'rollback',
      label: ConfigurationContent.PreviousActivatedVersion,
      command: {
        operationIdentifier: globalThis.crypto.randomUUID(),
        funnelIdentifier,
        expectedRevision,
      },
    };
  },

  key(ownerIdentifier: string): string {
    return `kelpie.publication-intent.${ownerIdentifier}`;
  },

  read(ownerIdentifier: string): Optional<PublicationIntent> {
    try {
      const stored = globalThis.sessionStorage.getItem(this.key(ownerIdentifier));

      if (isNull(stored)) {
        return undefined;
      }

      const candidate: unknown = JSON.parse(stored);

      return validateIntent(candidate) ? candidate : undefined;
    } catch {
      // Unavailable browser storage is surfaced before sending a mutation.
      return undefined;
    }
  },

  save(ownerIdentifier: string, intent: PublicationIntent): void {
    try {
      globalThis.sessionStorage.setItem(this.key(ownerIdentifier), JSON.stringify(intent));
    } catch (error) {
      throw new Error(ConfigurationMessages.StorageFailure, { cause: error });
    }
  },

  clear(ownerIdentifier: string): boolean {
    try {
      globalThis.sessionStorage.removeItem(this.key(ownerIdentifier));

      return true;
    } catch {
      // A retained command remains safe to replay using its original operation identifier.
      return false;
    }
  },
} as const;
