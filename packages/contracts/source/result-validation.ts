import { ConfigurationMessages } from './configuration-messages.js';
import type { ConfigurationValidationContext } from './configuration-validation-context.js';
import { ConditionValidation } from './condition-validation.js';

export const ResultValidation = {
  validate(context: ConfigurationValidationContext): void {
    const { configuration } = context;

    for (const [resultIdentifier, result] of Object.entries(configuration.results)) {
      if (result.id !== resultIdentifier) {
        context.report(
          `/results/${resultIdentifier}/id`,
          ConfigurationMessages.ResultIdentifierMismatch,
        );
      }
    }

    if (!Object.hasOwn(configuration.results, configuration.defaultResultId)) {
      context.report('/defaultResultId', ConfigurationMessages.UnknownDefaultResult);
    }

    configuration.resultRules.forEach((rule, position) => {
      if (!Object.hasOwn(configuration.results, rule.resultId)) {
        context.report(`/resultRules/${position}/resultId`, ConfigurationMessages.UnknownResult);
      }

      ConditionValidation.validate(context, rule.when, `/resultRules/${position}/when`);
    });
  },
} as const;
