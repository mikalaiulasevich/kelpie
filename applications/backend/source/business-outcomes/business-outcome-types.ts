import { Type, type Static } from 'typebox';
import { PublicationPolicy } from '../publications/publication-policy.js';
import {
  BusinessOutcomeKind,
  BusinessOutcomePolicy,
  BusinessOutcomeProvenance,
} from './business-outcome-policy.js';
export const BusinessOutcomeSchemas = {
  Request: Type.Object(
    {
      externalIdentifier: Type.String({
        minLength: 1,
        maxLength: BusinessOutcomePolicy.MaximumExternalIdentifierLength,
        pattern: '\\S',
      }),
      sessionIdentifier: Type.String({ pattern: PublicationPolicy.UuidPattern }),
      kind: Type.Enum(BusinessOutcomeKind),
      occurredAt: Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$' }),
      source: Type.String({
        minLength: 1,
        maxLength: BusinessOutcomePolicy.MaximumSourceLength,
        pattern: '^[a-zA-Z0-9][a-zA-Z0-9._-]*$',
      }),
      provenance: Type.Enum(BusinessOutcomeProvenance),
    },
    { additionalProperties: false },
  ),
  Query: Type.Object(
    { sessionIdentifier: Type.String({ pattern: PublicationPolicy.UuidPattern }) },
    { additionalProperties: false },
  ),
  Overview: Type.Object(
    { funnelIdentifier: Type.String({ minLength: 1, maxLength: 200 }) },
    { additionalProperties: false },
  ),
} as const;

export type BusinessOutcomeRequest = Static<typeof BusinessOutcomeSchemas.Request>;

export type BusinessOutcomeQuery = Static<typeof BusinessOutcomeSchemas.Query>;

export type BusinessOutcomeOverviewQuery = Static<typeof BusinessOutcomeSchemas.Overview>;
