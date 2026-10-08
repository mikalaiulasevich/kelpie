import { Type, type Static } from 'typebox';

export const TrafficSessionManifestSchema = Type.Object(
  {
    index: Type.Integer({ minimum: 0 }),
    sessionIdentifier: Type.String({ minLength: 1 }),
    versionIdentifier: Type.String({ minLength: 1 }),
    version: Type.Integer({ minimum: 1 }),
    variant: Type.Union([Type.Literal('A'), Type.Literal('B')]),
    forced: Type.Boolean(),
    acquisition: Type.Object(
      {
        source: Type.String(),
        medium: Type.String(),
        campaign: Type.String(),
      },
      { additionalProperties: false },
    ),
    submittedSteps: Type.Array(Type.String()),
    viewedSteps: Type.Array(Type.String()),
    transitions: Type.Array(
      Type.Object(
        { fromStepIdentifier: Type.String(), toStepIdentifier: Type.String() },
        { additionalProperties: false },
      ),
    ),
    resultIdentifier: Type.Union([Type.String(), Type.Null()]),
    resultViewed: Type.Boolean(),
    recommendationClicked: Type.Boolean(),
    recommendationExpanded: Type.Boolean(),
    completed: Type.Boolean(),
    expired: Type.Boolean(),
    replayedEvents: Type.Integer({ minimum: 0 }),
    rejectedEvents: Type.Integer({ minimum: 0 }),
    backChanges: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export type TrafficSessionManifest = Static<typeof TrafficSessionManifestSchema>;

export const TrafficOracleSelectionSchema = Type.Object({
  versionIdentifier: Type.Optional(Type.String()),
  variant: Type.Optional(Type.String()),
  campaign: Type.Optional(Type.String()),
  source: Type.Optional(Type.String()),
  medium: Type.Optional(Type.String()),
  includeForced: Type.Boolean(),
});

export type TrafficOracleSelection = Static<typeof TrafficOracleSelectionSchema>;

export const TrafficCoverageSpecificationSchema = Type.Object(
  {
    version: Type.Integer({ minimum: 1 }),
    variants: Type.Array(Type.Union([Type.Literal('A'), Type.Literal('B')]), {
      minItems: 2,
      uniqueItems: true,
    }),
    resultIdentifiers: Type.Array(Type.String(), { minItems: 1, uniqueItems: true }),
    conditionalStepIdentifiers: Type.Array(Type.String(), { uniqueItems: true }),
  },
  { additionalProperties: false },
);

export type TrafficCoverageSpecification = Static<typeof TrafficCoverageSpecificationSchema>;
