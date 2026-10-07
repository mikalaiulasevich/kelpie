import { Type } from 'typebox';

import { ConfigurationFormat } from './configuration-format.js';
import { ConfigurationSchemaPolicy } from './configuration-policy.js';
import { ConditionSchemas } from '../conditions/condition-schema.js';
import { ConfigurationStatus, ExperimentVariant, StepType } from '../shared/domain-values.js';
import { ResultSchemas } from '../results/result-schema.js';
import { SchemaPrimitives } from '../shared/schema-primitives.js';
import { StepSchemas } from '../steps/step-schema.js';

const stepOverrideSchema = Type.Object(
  { content: StepSchemas.StepContent },
  {
    additionalProperties: false,
  },
);

const variantConfigurationSchema = Type.Object(
  {
    weight: Type.Number(ConfigurationSchemaPolicy.VariantWeight),
    stepSequence: Type.Array(SchemaPrimitives.Identifier, ConfigurationSchemaPolicy.StepSequence),
    stepOverrides: SchemaPrimitives.dictionary(stepOverrideSchema),
    resultOverrides: SchemaPrimitives.dictionary(ResultSchemas.ResultOverride),
  },
  { additionalProperties: false },
);

const experimentConfigurationSchema = Type.Object(
  {
    id: SchemaPrimitives.Identifier,
    assignment: Type.Literal(ConfigurationFormat.ExperimentAssignment),
    sticky: Type.Literal(true),
    overrideQueryParam: SchemaPrimitives.Identifier,
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

const sessionConfigurationSchema = Type.Object(
  {
    ttlHours: Type.Number(ConfigurationSchemaPolicy.SessionLifetimeHours),
    persistAnswers: Type.Literal(true),
    pinVersion: Type.Literal(true),
    pinExperimentVariant: Type.Literal(true),
  },
  { additionalProperties: false },
);

const progressConfigurationSchema = Type.Object(
  {
    countVisibleOnly: Type.Literal(true),
    excludeTypes: Type.Array(Type.Enum(StepType), ConfigurationSchemaPolicy.ExcludedStepTypes),
  },
  { additionalProperties: false },
);

const eventDeclarationSchema = Type.Object(
  {
    name: SchemaPrimitives.Identifier,
    trigger: SchemaPrimitives.Text,
    properties: SchemaPrimitives.IdentifierList,
  },
  { additionalProperties: false },
);

const eventPrivacyConfigurationSchema = Type.Object(
  {
    storeRawAnswers: Type.Literal(false),
    allowAnswerKinds: Type.Literal(true),
  },
  { additionalProperties: false },
);

const eventsConfigurationSchema = Type.Object(
  {
    baseProperties: SchemaPrimitives.IdentifierList,
    allowed: Type.Array(eventDeclarationSchema, ConfigurationSchemaPolicy.EventDeclarations),
    privacy: eventPrivacyConfigurationSchema,
  },
  { additionalProperties: false },
);

const funnelConfigurationSchema = Type.Object(
  {
    schemaVersion: Type.Literal(ConfigurationFormat.SchemaVersion),
    funnelId: SchemaPrimitives.Identifier,
    version: Type.Integer(ConfigurationSchemaPolicy.Version),
    status: Type.Enum(ConfigurationStatus),
    locale: Type.String(ConfigurationSchemaPolicy.Locale),
    title: SchemaPrimitives.Text,
    description: SchemaPrimitives.Text,
    releaseNote: Type.Optional(SchemaPrimitives.Text),
    session: sessionConfigurationSchema,
    progress: progressConfigurationSchema,
    experiment: experimentConfigurationSchema,
    steps: SchemaPrimitives.dictionary(StepSchemas.FunnelStep, 1),
    resultRules: Type.Array(ResultSchemas.ResultRule, ConfigurationSchemaPolicy.ResultRules),
    defaultResultId: SchemaPrimitives.Identifier,
    results: SchemaPrimitives.dictionary(ResultSchemas.FunnelResult, 1),
    events: eventsConfigurationSchema,
  },
  {
    $id: ConfigurationFormat.SchemaIdentifier,
    additionalProperties: false,
    $defs: { [ConfigurationFormat.ConditionDefinition]: ConditionSchemas.Condition },
  },
);

export const ConfigurationSchemas = {
  StepOverride: stepOverrideSchema,
  VariantConfiguration: variantConfigurationSchema,
  ExperimentConfiguration: experimentConfigurationSchema,
  SessionConfiguration: sessionConfigurationSchema,
  ProgressConfiguration: progressConfigurationSchema,
  EventDeclaration: eventDeclarationSchema,
  EventPrivacyConfiguration: eventPrivacyConfigurationSchema,
  EventsConfiguration: eventsConfigurationSchema,
  FunnelConfiguration: funnelConfigurationSchema,
} as const;
