import { ConfigurationPaths } from './configuration-paths.js';
import { match, P } from 'ts-pattern';

import { ConfigurationMessages } from './configuration-messages.js';
import type { ConfigurationIssue } from './configuration-types.js';
import { informationContentSchema, interactiveContentSchema } from './step-schema.js';
import { configurationSchemaCompiler } from './configuration-schema-compiler.js';
import { StepType } from './domain-values.js';
import type { StepContent } from './step-types.js';

const informationContentRequirement = {
  validate: configurationSchemaCompiler.compile(informationContentSchema),
  path(contentPath: string): string {
    return contentPath;
  },
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

    if (requirement === undefined || requirement.validate(content)) {
      return undefined;
    }

    return { path: requirement.path(path), message: requirement.message };
  },
} as const;
