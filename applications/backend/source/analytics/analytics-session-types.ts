import { Type, type Static } from 'typebox';
import { ExperimentVariant } from '@kelpie/contracts';
import { AnalyticsSchemas } from './analytics-types.js';

export const AnalyticsSessionSchemas = {
  Selection: Type.Object(
    {
      stepIdentifier: Type.Optional(Type.String({ maxLength: 200 })),
      sessionIdentifier: Type.Optional(Type.String({ maxLength: 200 })),
      variant: Type.Optional(Type.Enum(ExperimentVariant)),
    },
    { additionalProperties: false },
  ),
  Row: Type.Object({ identifier: Type.String() }),
  Response: Type.Object({
    generatedAt: Type.String(),
    filters: AnalyticsSchemas.ResolvedQuery,
    pagination: Type.Object({
      limit: AnalyticsSchemas.Count,
      offset: AnalyticsSchemas.Count,
      hasMore: Type.Boolean(),
    }),
    sessions: Type.Array(
      Type.Object({
        sessionIdentifier: Type.String(),
        versionIdentifier: Type.String(),
        variant: Type.String(),
        startedAt: Type.String(),
        expiresAt: Type.String(),
        eventsHasMore: Type.Boolean(),
        events: Type.Array(
          Type.Object({
            name: Type.String(),
            source: Type.String(),
            occurredAt: Type.String(),
            stepIdentifier: Type.Union([Type.String(), Type.Null()]),
          }),
        ),
      }),
    ),
  }),
} as const;

export type AnalyticsSessionSelection = Readonly<Static<typeof AnalyticsSessionSchemas.Selection>>;

export type AnalyticsSessionRow = Readonly<Static<typeof AnalyticsSessionSchemas.Row>>;

export type AnalyticsSessionResponse = DeepReadonly<
  Static<typeof AnalyticsSessionSchemas.Response>
>;
