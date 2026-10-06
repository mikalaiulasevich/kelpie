import { ConfigurationPaths } from './configuration-paths.js';
import { ConfigurationMessages } from './configuration-messages.js';
import { configurationSchemaCompiler } from './configuration-schema-compiler.js';
import type { ConfigurationValidationResult, FunnelConfiguration } from './configuration-types.js';
import { ConfigurationDocumentBounds } from './configuration-document-bounds.js';
import { configurationLimits } from './configuration-policy.js';
import { ConfigurationSemantics } from './configuration-semantic-validation.js';
import { funnelConfigurationSchema } from './configuration-schema.js';

const structuralValidator =
  configurationSchemaCompiler.compile<FunnelConfiguration>(funnelConfigurationSchema);

export const FunnelConfigurations = {
  limits: configurationLimits,

  validate(document: unknown): ConfigurationValidationResult {
    const boundsError = ConfigurationDocumentBounds.check(document);

    if (boundsError !== undefined) {
      return { valid: false, issues: [{ path: ConfigurationPaths.root, message: boundsError }] };
    }

    if (!structuralValidator(document)) {
      return {
        valid: false,
        issues: (structuralValidator.errors ?? [])
          .slice(0, configurationLimits.maximumIssues)
          .map((error) => ({
            path: error.instancePath || ConfigurationPaths.root,
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
