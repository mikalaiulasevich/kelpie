import { identity } from 'es-toolkit/function';
import { isUndefined } from 'es-toolkit/predicate';
import { match, P } from 'ts-pattern';

import { ConfigurationPaths } from '../configurations/configuration-paths.js';
import { ConfigurationMessages } from '../configurations/configuration-messages.js';
import type { ConfigurationIssue } from '../configurations/configuration-types.js';
import { informationContentSchema, interactiveContentSchema } from './step-schema.js';
import { configurationSchemaCompiler } from '../configurations/validation/configuration-schema-compiler.js';
import { StepType } from '../shared/domain-values.js';
import type { StepContent } from './step-types.js';

const informationContentRequirement = {
  validate: configurationSchemaCompiler.compile(informationContentSchema),
  path: identity<string>,
  message: ConfigurationMessages.InformationContentRequired,
};

const interactiveContentRequirement = {
  validate: configurationSchemaCompiler.compile(interactiveContentSchema),
  path: ConfigurationPaths.contentTitle,
  message: ConfigurationMessages.InteractiveTitleRequired,
};

export const StepContentValidation = {
  validate(stepType: StepType, content: StepContent, path: string): Optional<ConfigurationIssue> {
    const requirement = match(stepType)
      .with(StepType.Information, () => informationContentRequirement)
      .with(StepType.Result, () => undefined)
      .with(
        P.union(StepType.Number, StepType.SingleSelect, StepType.MultiSelect),
        () => interactiveContentRequirement,
      )
      .exhaustive();

    if (isUndefined(requirement) || requirement.validate(content)) {
      return undefined;
    }

    return { path: requirement.path(path), message: requirement.message };
  },
} as const;
