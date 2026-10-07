import { Ajv } from 'ajv';
import { Type, type Static } from 'typebox';
import { isNull } from 'es-toolkit/predicate';
import { ManagementSchemas } from '../management/management-types';
import { ConfigurationContent } from './configuration-content';

export const PublicationIntentSchema = Type.Union([
  Type.Object({ kind: Type.Literal('publish'), command: ManagementSchemas.PublishRequest, label: Type.String({ maxLength: 100 }) }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('rollback'), command: ManagementSchemas.RollbackRequest, label: Type.String({ maxLength: 100 }) }, { additionalProperties: false }),
]);

export type PublicationIntent = Readonly<Static<typeof PublicationIntentSchema>>;

const validateIntent = new Ajv().compile<PublicationIntent>(PublicationIntentSchema);

export const PublicationIntents = {
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
      throw new Error(ConfigurationContent.StorageFailure, { cause: error });
    }
  },

  clear(ownerIdentifier: string): void {
    globalThis.sessionStorage.removeItem(this.key(ownerIdentifier));
  },
} as const;
