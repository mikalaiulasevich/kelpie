import type { Static } from 'typebox';

import type { ConfigurationSchemas } from './configuration-schema.js';
import type { ResultRule } from '../results/result-types.js';
import type { FunnelStep } from '../steps/step-types.js';

export type StepOverride = DeepReadonly<Static<typeof ConfigurationSchemas.StepOverride>>;

export type VariantConfiguration = DeepReadonly<
  Static<typeof ConfigurationSchemas.VariantConfiguration>
>;

export type ExperimentConfiguration = DeepReadonly<
  Static<typeof ConfigurationSchemas.ExperimentConfiguration>
>;

export type SessionConfiguration = DeepReadonly<
  Static<typeof ConfigurationSchemas.SessionConfiguration>
>;

export type ProgressConfiguration = DeepReadonly<
  Static<typeof ConfigurationSchemas.ProgressConfiguration>
>;

export type EventDeclaration = DeepReadonly<Static<typeof ConfigurationSchemas.EventDeclaration>>;

export type EventPrivacyConfiguration = DeepReadonly<
  Static<typeof ConfigurationSchemas.EventPrivacyConfiguration>
>;

export type EventsConfiguration = DeepReadonly<
  Static<typeof ConfigurationSchemas.EventsConfiguration>
>;

export type FunnelConfiguration = DeepReadonly<
  Omit<Static<typeof ConfigurationSchemas.FunnelConfiguration>, 'steps' | 'resultRules'>
> & {
  readonly steps: ReadonlyDictionary<string, FunnelStep>;
  readonly resultRules: readonly ResultRule[];
};

export interface ConfigurationIssue {
  readonly path: string;
  readonly message: string;
}

export type ConfigurationValidationResult =
  | {
      readonly valid: true;
      readonly configuration: FunnelConfiguration;
      readonly issues: readonly [];
    }
  | {
      readonly valid: false;
      readonly issues: readonly ConfigurationIssue[];
    };
