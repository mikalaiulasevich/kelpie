import type { Static } from 'typebox';

import type { Condition } from '../conditions/condition-types.js';
import type { ResultSchemas } from './result-schema.js';

export type PrimaryAction = DeepReadonly<Static<typeof ResultSchemas.PrimaryAction>>;

export type FunnelResult = DeepReadonly<Static<typeof ResultSchemas.FunnelResult>>;

export type ResultOverride = DeepReadonly<Static<typeof ResultSchemas.ResultOverride>>;

export type ResultRule = DeepReadonly<Omit<Static<typeof ResultSchemas.ResultRule>, 'when'>> & {
  readonly when: Condition;
};
