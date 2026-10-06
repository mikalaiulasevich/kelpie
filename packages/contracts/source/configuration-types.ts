import type { Static } from 'typebox';

import type {
  eventDeclarationSchema,
  eventPrivacyConfigurationSchema,
  eventsConfigurationSchema,
  experimentConfigurationSchema,
  funnelConfigurationSchema,
  progressConfigurationSchema,
  sessionConfigurationSchema,
  stepOverrideSchema,
  variantConfigurationSchema,
} from './configuration-schema.js';
import type { ResultRule } from './result-types.js';
import type { DeepReadonly } from './schema-primitives.js';
import type { FunnelStep } from './step-types.js';

export type StepOverride = DeepReadonly<Static<typeof stepOverrideSchema>>;
export type VariantConfiguration = DeepReadonly<Static<typeof variantConfigurationSchema>>;
export type ExperimentConfiguration = DeepReadonly<Static<typeof experimentConfigurationSchema>>;
export type SessionConfiguration = DeepReadonly<Static<typeof sessionConfigurationSchema>>;
export type ProgressConfiguration = DeepReadonly<Static<typeof progressConfigurationSchema>>;
export type EventDeclaration = DeepReadonly<Static<typeof eventDeclarationSchema>>;
export type EventPrivacyConfiguration = DeepReadonly<
  Static<typeof eventPrivacyConfigurationSchema>
>;
export type EventsConfiguration = DeepReadonly<Static<typeof eventsConfigurationSchema>>;

export type FunnelConfiguration = DeepReadonly<
  Omit<Static<typeof funnelConfigurationSchema>, 'steps' | 'resultRules'>
> & {
  readonly steps: Readonly<Record<string, FunnelStep>>;
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
