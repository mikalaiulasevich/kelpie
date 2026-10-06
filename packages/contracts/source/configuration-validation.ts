import { ConfigurationMessages } from './configuration-messages.js';
import { configurationSchemaCompiler } from './configuration-schema-compiler.js';
import type { ConfigurationValidationResult, FunnelConfiguration } from './configuration-types.js';
import { checkDocumentBounds, configurationLimits } from './configuration-document-bounds.js';
import { validateConfigurationSemantics } from './configuration-semantic-validation.js';
import { funnelConfigurationSchema } from './configuration-schema.js';

export { configurationLimits } from './configuration-document-bounds.js';

const structuralValidator =
  configurationSchemaCompiler.compile<FunnelConfiguration>(funnelConfigurationSchema);

export function validateFunnelConfiguration(document: unknown): ConfigurationValidationResult {
  const boundsError = checkDocumentBounds(document);

  if (boundsError !== undefined) {
    return { valid: false, issues: [{ path: '/', message: boundsError }] };
  }

  if (!structuralValidator(document)) {
    return {
      valid: false,
      issues: (structuralValidator.errors ?? [])
        .slice(0, configurationLimits.maximumIssues)
        .map((error) => ({
          path: error.instancePath || '/',
          message: error.message ?? ConfigurationMessages.InvalidConfiguration,
        })),
    };
  }

  const configuration = document;
  const issues = validateConfigurationSemantics(configuration);

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  return { valid: true, configuration, issues: [] };
}
