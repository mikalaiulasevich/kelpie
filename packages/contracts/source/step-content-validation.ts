import { match, P } from 'ts-pattern';
import type { ConfigurationIssue } from './configuration-types.js';
import { informationContentSchema, interactiveContentSchema } from './configuration-schema.js';
import { configurationSchemaCompiler } from './configuration-schema-compiler.js';
import { StepType } from './domain-values.js';
import type { FunnelStep } from './step-types.js';

const informationContentRequirement = {
  validate: configurationSchemaCompiler.compile(informationContentSchema),
  pathSuffix: '',
  message: 'Information steps require title, body, and primary action label.',
};

const interactiveContentRequirement = {
  validate: configurationSchemaCompiler.compile(interactiveContentSchema),
  pathSuffix: '/title',
  message: 'Interactive steps require a title.',
};

export function validateStepContent(step: FunnelStep, path: string): ConfigurationIssue | undefined {
  const requirement = match(step.type)
    .with(StepType.Information, () => informationContentRequirement)
    .with(StepType.Result, () => undefined)
    .with(
      P.union(StepType.Number, StepType.SingleSelect, StepType.MultiSelect),
      () => interactiveContentRequirement,
    )
    .exhaustive();

  if (requirement === undefined || requirement.validate(step.content)) {
    return undefined;
  }

  return { path: `${path}${requirement.pathSuffix}`, message: requirement.message };
}
