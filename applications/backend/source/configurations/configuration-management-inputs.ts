import { BadRequestException } from '@nestjs/common';
import { Type } from 'typebox';
import { SchemaCompiler } from '../validation/schema-compiler.js';
import { ConfigurationImportPolicy } from './configuration-import-policy.js';
import { ConfigurationManagementMessages } from './configuration-management-messages.js';

const ConfigurationManagementValidators = {
  identifier: SchemaCompiler.compile<string>(
    Type.String({ pattern: ConfigurationImportPolicy.VersionIdentifierPattern }),
  ),
} as const;

export const ConfigurationManagementInputs = {
  identifier(value: unknown): string {
    if (!ConfigurationManagementValidators.identifier(value)) {
      throw new BadRequestException(ConfigurationManagementMessages.InvalidIdentifier);
    }

    return value;
  },
} as const;
