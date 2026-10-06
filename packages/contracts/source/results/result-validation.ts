import { ConfigurationPaths } from '../configurations/configuration-paths.js';
import { ConfigurationMessages } from '../configurations/configuration-messages.js';
import type { ConfigurationValidationContext } from '../configurations/validation/configuration-validation-context.js';
import { ConditionValidation } from './condition-validation.js';

export const ResultValidation = {
  validate(context: ConfigurationValidationContext): void {
    const { configuration } = context;

    for (const [resultIdentifier, result] of Object.entries(configuration.results)) {
      if (result.id !== resultIdentifier) {
        context.report(
          ConfigurationPaths.resultIdentifier(resultIdentifier),
          ConfigurationMessages.ResultIdentifierMismatch,
        );
      }
    }

    if (!Object.hasOwn(configuration.results, configuration.defaultResultId)) {
      context.report(ConfigurationPaths.defaultResult, ConfigurationMessages.UnknownDefaultResult);
    }

    configuration.resultRules.forEach((rule, position) => {
      if (!Object.hasOwn(configuration.results, rule.resultId)) {
        context.report(
          ConfigurationPaths.resultRule(position).result,
          ConfigurationMessages.UnknownResult,
        );
      }

      ConditionValidation.validate(
        context,
        rule.when,
        ConfigurationPaths.resultRule(position).condition,
      );
    });
  },
} as const;
