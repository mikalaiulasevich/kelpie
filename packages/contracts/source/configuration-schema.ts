import { Type } from 'typebox';

import { ConfigurationSchemaPolicy } from './configuration-policy.js';

import { conditionSchema } from './condition-schema.js';
import { ConfigurationStatus, ExperimentVariant, StepType } from './domain-values.js';
import { funnelResultSchema, resultOverrideSchema, resultRuleSchema } from './result-schema.js';
import {
  dictionarySchema,
  identifierListSchema,
  identifierSchema,
  textSchema,
} from './schema-primitives.js';
import { funnelStepSchema, stepContentSchema } from './step-schema.js';

export { informationContentSchema, interactiveContentSchema } from './step-schema.js';

export const stepOverrideSchema = Type.Object(
  { content: stepContentSchema },
  {
    additionalProperties: false,
  },
);

export const variantConfigurationSchema = Type.Object(
  {
    weight: Type.Number(ConfigurationSchemaPolicy.variantWeight),
    stepSequence: Type.Array(identifierSchema, ConfigurationSchemaPolicy.stepSequence),
    stepOverrides: dictionarySchema(stepOverrideSchema),
    resultOverrides: dictionarySchema(resultOverrideSchema),
  },
  { additionalProperties: false },
);

export const experimentConfigurationSchema = Type.Object(
  {
    id: identifierSchema,
    assignment: Type.Literal('server'),
    sticky: Type.Literal(true),
    overrideQueryParam: identifierSchema,
    variants: Type.Object(
      {
        [ExperimentVariant.A]: variantConfigurationSchema,
        [ExperimentVariant.B]: variantConfigurationSchema,
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const sessionConfigurationSchema = Type.Object(
  {
    ttlHours: Type.Number(ConfigurationSchemaPolicy.sessionLifetimeHours),
    persistAnswers: Type.Literal(true),
    pinVersion: Type.Literal(true),
    pinExperimentVariant: Type.Literal(true),
  },
  { additionalProperties: false },
);

export const progressConfigurationSchema = Type.Object(
  {
    countVisibleOnly: Type.Literal(true),
    excludeTypes: Type.Array(Type.Enum(StepType), ConfigurationSchemaPolicy.excludedStepTypes),
  },
  { additionalProperties: false },
);

export const eventDeclarationSchema = Type.Object(
  {
    name: identifierSchema,
    trigger: textSchema,
    properties: identifierListSchema,
  },
  { additionalProperties: false },
);

export const eventPrivacyConfigurationSchema = Type.Object(
  {
    storeRawAnswers: Type.Literal(false),
    allowAnswerKinds: Type.Literal(true),
  },
  { additionalProperties: false },
);

export const eventsConfigurationSchema = Type.Object(
  {
    baseProperties: identifierListSchema,
    allowed: Type.Array(eventDeclarationSchema, ConfigurationSchemaPolicy.eventDeclarations),
    privacy: eventPrivacyConfigurationSchema,
  },
  { additionalProperties: false },
);

export const funnelConfigurationSchema = Type.Object(
  {
    schemaVersion: Type.Literal('1.0'),
    funnelId: identifierSchema,
    version: Type.Integer(ConfigurationSchemaPolicy.version),
    status: Type.Enum(ConfigurationStatus),
    locale: Type.String(ConfigurationSchemaPolicy.locale),
    title: textSchema,
    description: textSchema,
    releaseNote: Type.Optional(textSchema),
    session: sessionConfigurationSchema,
    progress: progressConfigurationSchema,
    experiment: experimentConfigurationSchema,
    steps: dictionarySchema(funnelStepSchema, 1),
    resultRules: Type.Array(resultRuleSchema, ConfigurationSchemaPolicy.resultRules),
    defaultResultId: identifierSchema,
    results: dictionarySchema(funnelResultSchema, 1),
    events: eventsConfigurationSchema,
  },
  {
    $id: 'https://kelpie.local/schemas/funnel-1.0',
    additionalProperties: false,
    $defs: { condition: conditionSchema },
  },
);
