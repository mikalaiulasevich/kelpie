import type { Static } from 'typebox';

import type { Condition } from '../conditions/condition-types.js';
import type {
  funnelResultSchema,
  primaryActionSchema,
  resultOverrideSchema,
  resultRuleSchema,
} from './result-schema.js';

export type PrimaryAction = DeepReadonly<Static<typeof primaryActionSchema>>;
export type FunnelResult = DeepReadonly<Static<typeof funnelResultSchema>>;
export type ResultOverride = DeepReadonly<Static<typeof resultOverrideSchema>>;
export type ResultRule = DeepReadonly<Omit<Static<typeof resultRuleSchema>, 'when'>> & {
  readonly when: Condition;
};
