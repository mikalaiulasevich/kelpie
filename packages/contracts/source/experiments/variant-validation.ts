import { isUndefined } from 'es-toolkit/predicate';
import { ConfigurationPaths } from '../configurations/configuration-paths.js';
import { ConditionValidation } from '../conditions/condition-validation.js';
import { ConfigurationMessages } from '../configurations/configuration-messages.js';
import { ConfigurationSchemaPolicy } from '../configurations/configuration-policy.js';
import type { ConfigurationValidationContext } from '../configurations/validation/configuration-validation-context.js';
import type { VariantConfiguration } from '../configurations/configuration-types.js';
import { DictionaryAccess } from '../shared/dictionary.js';
import { StepType } from '../shared/domain-values.js';
import { StepContentValidation } from '../steps/step-content-validation.js';
import type { FunnelStep } from '../steps/step-types.js';

/** Answer availability and result counts belong to one variant traversal. */
class VariantSequenceValidation {
  private readonly earlierAnswers = new Set<string>();

  private resultCount = 0;

  private readonly paths: ReturnType<typeof ConfigurationPaths.variant>;

  constructor(
    private readonly context: ConfigurationValidationContext,
    variantIdentifier: string,
    private readonly variant: VariantConfiguration,
  ) {
    this.paths = ConfigurationPaths.variant(variantIdentifier);
  }

  validate(): void {
    for (const [position, stepIdentifier] of this.variant.stepSequence.entries()) {
      this.validateStep(stepIdentifier, position);
    }

    if (this.resultCount !== ConfigurationSchemaPolicy.RequiredResultSteps) {
      this.context.report(this.paths.sequence, ConfigurationMessages.SingleResultRequired);
    }

    this.validateOverrideTargets();
  }

  private validateStep(stepIdentifier: string, position: number): void {
    const step = DictionaryAccess.readOwn(this.context.configuration.steps, stepIdentifier);

    if (isUndefined(step)) {
      this.context.report(this.paths.sequence, ConfigurationMessages.UnknownStep(stepIdentifier));

      return;
    }

    this.validateContent(stepIdentifier, step);
    this.validateVisibility(stepIdentifier, step);
    this.trackStep(step, position);
  }

  private validateContent(stepIdentifier: string, step: FunnelStep): void {
    const override = DictionaryAccess.readOwn(this.variant.stepOverrides, stepIdentifier);

    if (isUndefined(override)) {
      return;
    }

    const issue = StepContentValidation.validate(
      step.type,
      { ...step.content, ...override.content },
      this.paths.stepOverrideContent(stepIdentifier),
    );

    if (!isUndefined(issue)) {
      this.context.report(issue.path, issue.message);
    }
  }

  private validateVisibility(stepIdentifier: string, step: FunnelStep): void {
    if (isUndefined(step.visibleWhen)) {
      return;
    }

    ConditionValidation.validate(
      this.context,
      step.visibleWhen,
      ConfigurationPaths.step(stepIdentifier).visibility,
      this.earlierAnswers,
    );
  }

  private trackStep(step: FunnelStep, position: number): void {
    if (step.type === StepType.Result) {
      this.resultCount += 1;

      if (position !== this.variant.stepSequence.length - 1) {
        this.context.report(this.paths.sequence, ConfigurationMessages.FinalResultPositionRequired);
      }

      return;
    }

    if (step.type !== StepType.Information) {
      this.earlierAnswers.add(step.input.name);
    }
  }

  private validateOverrideTargets(): void {
    const sequenceIdentifiers = new Set(this.variant.stepSequence);

    for (const stepIdentifier of Object.keys(this.variant.stepOverrides)) {
      if (!sequenceIdentifiers.has(stepIdentifier)) {
        this.context.report(
          this.paths.stepOverride(stepIdentifier),
          ConfigurationMessages.OverrideOutsideVariant,
        );
      }
    }

    for (const resultIdentifier of Object.keys(this.variant.resultOverrides)) {
      if (!Object.hasOwn(this.context.configuration.results, resultIdentifier)) {
        this.context.report(
          this.paths.resultOverride(resultIdentifier),
          ConfigurationMessages.UnknownResultOverride,
        );
      }
    }
  }
}

export const VariantValidation = {
  validate(context: ConfigurationValidationContext): void {
    const variants = context.configuration.experiment.variants;

    for (const [identifier, variant] of Object.entries(variants)) {
      new VariantSequenceValidation(context, identifier, variant).validate();
    }

    if (variants.A.weight + variants.B.weight !== ConfigurationSchemaPolicy.TotalExperimentWeight) {
      context.report(ConfigurationPaths.Variants, ConfigurationMessages.InvalidVariantWeightTotal);
    }
  },
} as const;
