import { Type, type Static } from 'typebox';
import { ManagementPolicy } from './management-policy';

const ManagementFields = {
  Identifier: Type.String({
    minLength: 1,
    maxLength: ManagementPolicy.MaximumIdentifierLength,
    pattern: ManagementPolicy.IdentifierPattern,
  }),
  Count: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
  VersionIdentifier: Type.String({ pattern: ManagementPolicy.UuidPattern }),
  Variant: Type.Enum({ A: 'A', B: 'B' } as const),
  TrafficOrigin: Type.Enum({
    Production: 'production',
    Synthetic: 'synthetic',
    All: 'all',
  } as const),
  Funnel: Type.Object({
    identifier: Type.String(),
    activeVersionIdentifier: Type.Union([Type.String(), Type.Null()]),
    revision: Type.Integer(),
  }),
  Version: Type.Object({
    identifier: Type.String(),
    funnelIdentifier: Type.String(),
    version: Type.Integer(),
    schemaVersion: Type.String(),
    checksum: Type.String(),
  }),
} as const;

const queryProperties = {
  funnelIdentifier: ManagementFields.Identifier,
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: ManagementPolicy.MaximumPageSize })),
  offset: Type.Optional(Type.Integer({ minimum: 0, maximum: ManagementPolicy.MaximumOffset })),
};

const analyticsQueryProperties = {
  funnelIdentifier: ManagementFields.Identifier,
  versionIdentifier: Type.Optional(ManagementFields.VersionIdentifier),
  campaign: Type.Optional(Type.String({ maxLength: ManagementPolicy.MaximumCampaignLength })),
  includeForced: Type.Optional(Type.Boolean()),
  trafficOrigin: Type.Optional(ManagementFields.TrafficOrigin),
  limit: Type.Optional(
    Type.Integer({ minimum: 1, maximum: ManagementPolicy.MaximumAnalyticsPageSize }),
  ),
  offset: queryProperties.offset,
};

const commandProperties = {
  operationIdentifier: ManagementFields.VersionIdentifier,
  funnelIdentifier: ManagementFields.Identifier,
  expectedRevision: Type.Integer({ minimum: 0, maximum: ManagementPolicy.MaximumRevision }),
};

const publication = Type.Object({
  identifier: Type.String(),
  operationIdentifier: Type.String(),
  action: Type.String(),
  administratorIdentifier: Type.String(),
  funnelIdentifier: Type.String(),
  targetVersionIdentifier: Type.String(),
  previousVersionIdentifier: Type.Union([Type.String(), Type.Null()]),
  revision: Type.Integer(),
  createdAt: Type.String(),
});

const ratio = Type.Object({
  numerator: ManagementFields.Count,
  denominator: ManagementFields.Count,
  value: Type.Union([Type.Number({ minimum: 0, maximum: 1 }), Type.Null()]),
});

const noncompletion = Type.Object({
  open: ManagementFields.Count,
  expired: ManagementFields.Count,
});

const stepProperties = {
  stepIdentifier: Type.String(),
  conditional: Type.Boolean(),
  reached: ManagementFields.Count,
};

const step = Type.Union([
  Type.Object(
    {
      ...stepProperties,
      type: Type.Enum({
        Information: 'info',
        Number: 'number',
        SingleSelect: 'single-select',
        MultiSelect: 'multi-select',
      } as const),
      completed: ManagementFields.Count,
      completion: ratio,
      noncompletion,
      expiredDropout: ratio,
    },
    { additionalProperties: false },
  ),
  Type.Object({ ...stepProperties, type: Type.Literal('result') }, { additionalProperties: false }),
]);

const edge = Type.Object({
  fromStepIdentifier: Type.String(),
  toStepIdentifier: Type.String(),
  transitions: ManagementFields.Count,
  observedConversion: ratio,
  branchShare: ratio,
  transitionToView: ratio,
  destinationNonreach: noncompletion,
});

const variant = Type.Object({
  variant: ManagementFields.Variant,
  started: ManagementFields.Count,
  resultCompletion: ratio,
  ctaConversion: ratio,
  ctaClickThrough: ratio,
  steps: Type.Array(step),
  edges: Type.Array(edge),
});

const version = Type.Object({
  versionIdentifier: Type.String(),
  funnelVersion: ManagementFields.Count,
  experimentIdentifier: Type.String(),
  variants: Type.Array(variant),
});

export const ManagementSchemas = {
  Query: Type.Object(queryProperties, { additionalProperties: false }),
  AnalyticsQuery: Type.Object(analyticsQueryProperties, { additionalProperties: false }),
  ConfigurationVersion: ManagementFields.Version,
  ConfigurationList: Type.Object({
    funnel: ManagementFields.Funnel,
    items: Type.Array(ManagementFields.Version),
    nextOffset: Type.Union([Type.Integer(), Type.Null()]),
  }),
  ConfigurationImportResult: Type.Object({
    outcome: Type.Enum({ Created: 'created', Existing: 'existing' } as const),
    version: ManagementFields.Version,
  }),
  Publication: publication,
  PublicationHistory: Type.Object({
    funnel: ManagementFields.Funnel,
    items: Type.Array(publication),
    nextOffset: Type.Union([Type.Integer(), Type.Null()]),
  }),
  PublishRequest: Type.Object(
    { ...commandProperties, targetVersionIdentifier: ManagementFields.VersionIdentifier },
    { additionalProperties: false },
  ),
  RollbackRequest: Type.Object(commandProperties, { additionalProperties: false }),
  AnalyticsRatio: ratio,
  AnalyticsStep: step,
  AnalyticsEdge: edge,
  AnalyticsVariant: variant,
  AnalyticsVersion: version,
  AnalyticsResponse: Type.Object({
    generatedAt: Type.String(),
    filters: Type.Object(
      {
        ...analyticsQueryProperties,
        includeForced: Type.Boolean(),
        trafficOrigin: ManagementFields.TrafficOrigin,
        limit: Type.Integer({ minimum: 1, maximum: ManagementPolicy.MaximumAnalyticsPageSize }),
        offset: Type.Integer({ minimum: 0, maximum: ManagementPolicy.MaximumOffset }),
      },
      { additionalProperties: false },
    ),
    pagination: Type.Object({
      limit: ManagementFields.Count,
      offset: ManagementFields.Count,
      hasMore: Type.Boolean(),
    }),
    versions: Type.Array(version),
  }),
  Issue: Type.Object({ path: Type.String(), message: Type.String() }),
  ErrorBody: Type.Object({
    code: Type.Optional(Type.String()),
    issues: Type.Optional(Type.Array(Type.Unknown())),
  }),
} as const;

export type ManagementQuery = Readonly<Static<typeof ManagementSchemas.Query>>;

export type AnalyticsQuery = Readonly<Static<typeof ManagementSchemas.AnalyticsQuery>>;

export type ConfigurationVersionMetadata = Readonly<
  Static<typeof ManagementSchemas.ConfigurationVersion>
>;

export type ConfigurationList = DeepReadonly<Static<typeof ManagementSchemas.ConfigurationList>>;

export type ConfigurationImportResult = DeepReadonly<
  Static<typeof ManagementSchemas.ConfigurationImportResult>
>;

export type PublicationResponse = Readonly<Static<typeof ManagementSchemas.Publication>>;

export type PublicationHistory = DeepReadonly<Static<typeof ManagementSchemas.PublicationHistory>>;

export type PublishRequest = Readonly<Static<typeof ManagementSchemas.PublishRequest>>;

export type RollbackRequest = Readonly<Static<typeof ManagementSchemas.RollbackRequest>>;

export type AnalyticsRatio = Readonly<Static<typeof ManagementSchemas.AnalyticsRatio>>;

export type AnalyticsStep = DeepReadonly<Static<typeof ManagementSchemas.AnalyticsStep>>;

export type AnalyticsEdge = DeepReadonly<Static<typeof ManagementSchemas.AnalyticsEdge>>;

export type AnalyticsVariant = DeepReadonly<Static<typeof ManagementSchemas.AnalyticsVariant>>;

export type AnalyticsVersion = DeepReadonly<Static<typeof ManagementSchemas.AnalyticsVersion>>;

export type AnalyticsResponse = DeepReadonly<Static<typeof ManagementSchemas.AnalyticsResponse>>;

export type ManagementIssue = Readonly<Static<typeof ManagementSchemas.Issue>>;

export type ManagementErrorBody = Readonly<Static<typeof ManagementSchemas.ErrorBody>>;
