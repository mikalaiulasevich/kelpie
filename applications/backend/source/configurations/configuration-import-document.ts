import { createHash } from 'node:crypto';
import { pick } from 'es-toolkit/object';
import { sortBy } from 'es-toolkit/array';
import { FunnelConfigurations, type FunnelConfiguration } from '@kelpie/contracts';
import {
  isBoolean,
  isEqual,
  isNull,
  isNumber,
  isPlainObject,
  isString,
} from 'es-toolkit/predicate';
import { attempt } from 'es-toolkit/util';
import type { Prisma } from '../../generated/prisma/client.js';
import { ConfigurationImportError } from './configuration-import-error.js';
import { ConfigurationImportMessages } from './configuration-import-messages.js';
import { ConfigurationImportPolicy } from './configuration-import-policy.js';
import {
  ConfigurationImportErrorCode,
  type PreparedConfigurationImport,
  type ConfigurationVersionMetadata,
  type ConfigurationContentIdentity,
} from './configuration-import-types.js';

const ConfigurationJson = {
  object(value: object): Prisma.InputJsonObject {
    return Object.fromEntries(
      sortBy(Object.entries(value), [([key]) => key]).map(([key, child]) => [
        key,
        ConfigurationJson.value(child),
      ]),
    );
  },

  value(value: unknown): Prisma.InputJsonValue | null {
    if (isNull(value) || isString(value) || isBoolean(value) || isNumber(value)) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((child: unknown) => ConfigurationJson.value(child));
    }

    if (isPlainObject(value)) {
      return ConfigurationJson.object(value);
    }

    throw ConfigurationImportDocument.invalidSnapshot();
  },
} as const;

export const ConfigurationImportDocument = {
  identity(prepared: PreparedConfigurationImport): ConfigurationContentIdentity {
    return {
      funnelIdentifier: prepared.configuration.funnelId,
      version: prepared.configuration.version,
      schemaVersion: prepared.configuration.schemaVersion,
      checksum: prepared.checksum,
    };
  },

  matchesVersion(
    version: ConfigurationVersionMetadata,
    prepared: PreparedConfigurationImport,
  ): boolean {
    return isEqual(
      pick(version, ConfigurationImportPolicy.IdentityFields),
      ConfigurationImportDocument.identity(prepared),
    );
  },

  invalidSnapshot(): ConfigurationImportError {
    return new ConfigurationImportError(ConfigurationImportErrorCode.Invalid, [
      {
        path: ConfigurationImportPolicy.RootPath,
        message: ConfigurationImportMessages.SnapshotUnavailable,
      },
    ]);
  },

  validate(document: unknown): FunnelConfiguration {
    const [, result] = attempt(() => FunnelConfigurations.validate(document));

    if (isNull(result)) {
      throw ConfigurationImportDocument.invalidSnapshot();
    }

    if (!result.valid) {
      throw new ConfigurationImportError(ConfigurationImportErrorCode.Invalid, result.issues);
    }

    return result.configuration;
  },

  prepare(document: unknown): PreparedConfigurationImport {
    const validated = ConfigurationImportDocument.validate(document);
    const [, snapshot] = attempt(() => structuredClone(validated));

    if (isNull(snapshot)) {
      throw ConfigurationImportDocument.invalidSnapshot();
    }

    // Clone and revalidate before yielding: getters and caller-owned objects must
    // not change the document between validation, hashing and persistence.
    const configuration = ConfigurationImportDocument.validate(snapshot);
    const normalized = ConfigurationJson.object(configuration);
    const checksum = createHash(ConfigurationImportPolicy.HashAlgorithm)
      .update(JSON.stringify(normalized))
      .digest(ConfigurationImportPolicy.HashEncoding);

    return { configuration, document: normalized, checksum };
  },
} as const;
