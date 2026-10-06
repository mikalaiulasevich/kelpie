import { ConfigurationPaths } from '../configurations/configuration-paths.js';
import { ConfigurationMessages } from '../configurations/configuration-messages.js';
import type { ConfigurationValidationContext } from '../configurations/validation/configuration-validation-context.js';
import { ConditionValidation } from '../conditions/condition-validation.js';

export const ResultValidation = {
  identifiers(context: ConfigurationValidationContext): void {
    for (const [resultIdentifier, result] of Object.entries(context.configuration.results)) {
      if (result.id !== resultIdentifier) {
        context.report(
          ConfigurationPaths.resultIdentifier(resultIdentifier),
          ConfigurationMessages.ResultIdentifierMismatch,
        );
      }
    }
  },

  defaultResult(context: ConfigurationValidationContext): void {
    const { configuration } = context;

    if (!Object.hasOwn(configuration.results, configuration.defaultResultId)) {
      context.report(ConfigurationPaths.DefaultResult, ConfigurationMessages.UnknownDefaultResult);
    }
  },

  rules(context: ConfigurationValidationContext): void {
    const { configuration } = context;

    configuration.resultRules.forEach((rule, position) => {
      const paths = ConfigurationPaths.resultRule(position);

      if (!Object.hasOwn(configuration.results, rule.resultId)) {
        context.report(paths.result, ConfigurationMessages.UnknownResult);
      }

      ConditionValidation.validate(context, rule.when, paths.condition);
    });
  },

  validate(context: ConfigurationValidationContext): void {
    ResultValidation.identifiers(context);
    ResultValidation.defaultResult(context);
    ResultValidation.rules(context);
  },
} as const;
