import { Ajv } from 'ajv';
import { Type, type Static } from 'typebox';
import { ManagementTransport } from '../management/management-transport';
import type { AnalyticsQuery } from '../management/management-types';

const SessionResponseSchema = Type.Object({
  generatedAt: Type.String(),
  pagination: Type.Object({
    limit: Type.Integer(),
    offset: Type.Integer(),
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
});
const validate = new Ajv().compile<Static<typeof SessionResponseSchema>>(SessionResponseSchema);

export const AnalyticsSessionClient = {
  sessions(query: AnalyticsQuery, signal: AbortSignal) {
    return ManagementTransport.request({
      path: '/api/administration/analytics/sessions',
      method: 'GET',
      query,
      signal,
      validate,
    });
  },
} as const;
