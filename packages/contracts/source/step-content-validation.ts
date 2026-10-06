import { match, P } from 'ts-pattern';

import type { Optional } from './optional-types.js';
import { ConfigurationMessages } from './configuration-messages.js';
import type { ConfigurationIssue } from './configuration-types.js';
import { informationContentSchema, interactiveContentSchema } from './configuration-schema.js';
import { configurationSchemaCompiler } from './configuration-schema-compiler.js';
import { StepType } from './domain-values.js';
import type { StepContent } from './step-types.js';

const informationContentRequirement = {
  validate: configurationSchemaCompiler.compile(informationContentSchema),
  pathSuffix: '',
  message: ConfigurationMessages.InformationContentRequired,
};

const interactiveContentRequirement = {
  validate: configurationSchemaCompiler.compile(interactiveContentSchema),
  pathSuffix: '/title',
  message: ConfigurationMessages.InteractiveTitleRequired,
};

export function validateStepContent(
  stepType: StepType,
  content: StepContent,
  path: string,
): Optional<ConfigurationIssue> {
  const requirement = match(stepType)
    .with(StepType.Information, () => informationContentRequirement)
    .with(StepType.Result, () => undefined)
    .with(
      P.union(StepType.Number, StepType.SingleSelect, StepType.MultiSelect),
      () => interactiveContentRequirement,
    )
    .exhaustive();

  if (requirement === undefined || requirement.validate(content)) {
    return undefined;
  }

  return { path: `${path}${requirement.pathSuffix}`, message: requirement.message };
}
