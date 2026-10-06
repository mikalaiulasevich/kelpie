import { ConfigurationPaths } from './configuration-paths.js';
import { ConfigurationMessages } from './configuration-messages.js';
import { configurationSchemaCompiler } from './validation/configuration-schema-compiler.js';
import type { ConfigurationValidationResult, FunnelConfiguration } from './configuration-types.js';
import { ConfigurationDocumentBounds } from './validation/configuration-document-bounds.js';
import { ConfigurationLimits } from './configuration-policy.js';
import { ConfigurationSemantics } from './validation/configuration-semantic-validation.js';
import { funnelConfigurationSchema } from './configuration-schema.js';

const structuralValidator =
  configurationSchemaCompiler.compile<FunnelConfiguration>(funnelConfigurationSchema);

export const FunnelConfigurations = {
  limits: ConfigurationLimits,

  validate(document: unknown): ConfigurationValidationResult {
    const boundsError = ConfigurationDocumentBounds.check(document);

    if (boundsError !== undefined) {
      return { valid: false, issues: [{ path: ConfigurationPaths.Root, message: boundsError }] };
    }

    if (!structuralValidator(document)) {
      return {
        valid: false,
        issues: (structuralValidator.errors ?? [])
          .slice(0, ConfigurationLimits.maximumIssues)
          .map((error) => ({
            path: error.instancePath || ConfigurationPaths.Root,
            message: error.message ?? ConfigurationMessages.InvalidConfiguration,
          })),
      };
    }

    const configuration = document;
    const issues = ConfigurationSemantics.validate(configuration);

    if (issues.length > 0) {
      return { valid: false, issues };
    }

    return { valid: true, configuration, issues: [] };
  },
} as const;
