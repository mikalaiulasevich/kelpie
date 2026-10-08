import { Type, type Static } from 'typebox';
import { SessionSchemas } from './session-types.js';

import { SessionReplayPolicy } from './session-replay-policy.js';

export const SessionReplaySchemas = {
  Compact: Type.Object(
    {
      format: Type.Literal(SessionReplayPolicy.Format),
      state: Type.Omit(SessionSchemas.State, ['configuration', 'result'], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
} as const;

export type CompactSessionReplay = Readonly<Static<typeof SessionReplaySchemas.Compact>>;
