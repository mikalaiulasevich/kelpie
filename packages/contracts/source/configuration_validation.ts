import { Ajv } from 'ajv';
import type { ConfigurationValidationResult, FunnelConfiguration } from './configuration_types.js';
import { checkDocumentBounds, configurationLimits } from './configuration_document_bounds.js';
import { validateConfigurationSemantics } from './configuration_semantic_validation.js';
import { funnelConfigurationSchema } from './configuration_schema.js';

export { configurationLimits } from './configuration_document_bounds.js';

const structuralValidator = new Ajv({
  allErrors: false,
  strict: true,
  allowUnionTypes: true,
  ownProperties: true,
}).compile<FunnelConfiguration>(funnelConfigurationSchema);

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
          message: error.message ?? 'Invalid configuration.',
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
