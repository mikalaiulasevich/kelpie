import { identity } from 'es-toolkit/function';
import { isUndefined } from 'es-toolkit/predicate';
import { match, P } from 'ts-pattern';

import { ConfigurationPaths } from '../configurations/configuration-paths.js';
import { ConfigurationMessages } from '../configurations/configuration-messages.js';
import type { ConfigurationIssue } from '../configurations/configuration-types.js';
import { StepSchemas } from './step-schema.js';
import { configurationSchemaCompiler } from '../configurations/validation/configuration-schema-compiler.js';
import { StepType } from '../shared/domain-values.js';
import type { StepContent } from './step-types.js';

const ContentRequirements = {
  Information: {
    validate: configurationSchemaCompiler.compile(StepSchemas.InformationContent),
    path: identity<string>,
    message: ConfigurationMessages.InformationContentRequired,
  },
  Interactive: {
    validate: configurationSchemaCompiler.compile(StepSchemas.InteractiveContent),
    path: ConfigurationPaths.contentTitle,
    message: ConfigurationMessages.InteractiveTitleRequired,
  },
} as const;

export const StepContentValidation = {
  validate(stepType: StepType, content: StepContent, path: string): Optional<ConfigurationIssue> {
    const requirement = match(stepType)
      .with(StepType.Information, () => ContentRequirements.Information)
      .with(StepType.Result, () => undefined)
      .with(
        P.union(StepType.Number, StepType.SingleSelect, StepType.MultiSelect),
        () => ContentRequirements.Interactive,
      )
      .exhaustive();

    if (isUndefined(requirement) || requirement.validate(content)) {
      return undefined;
    }

    return { path: requirement.path(path), message: requirement.message };
  },
} as const;
