import { ExperimentVariant } from '@kelpie/contracts';
import { Type, type Static } from 'typebox';
import { SessionPolicy } from '../sessions/session-policy.js';

const AcquisitionValue = Type.Optional(
  Type.String({ maxLength: SessionPolicy.MaximumAcquisitionCharacters }),
);

export const ConfigurationPreviewSchema = Type.Object(
  {
    operationIdentifier: Type.String({ pattern: SessionPolicy.OperationPattern }),
    clientTimestamp: Type.String({ pattern: SessionPolicy.TimestampPattern }),
    variant: Type.Optional(Type.Enum(ExperimentVariant)),
    acquisition: Type.Optional(
      Type.Object(
        {
          utm_source: AcquisitionValue,
          utm_medium: AcquisitionValue,
          utm_campaign: AcquisitionValue,
          utm_term: AcquisitionValue,
          utm_content: AcquisitionValue,
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export type ConfigurationPreviewRequest = Readonly<Static<typeof ConfigurationPreviewSchema>>;
