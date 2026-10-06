import type { ConfigurationStatus, ExperimentVariant, StepType } from './domain-values.js';
import type { FunnelResult, ResultOverride, ResultRule } from './result-types.js';
import type { FunnelStep, StepContent } from './step-types.js';

export interface StepOverride {
  readonly content: StepContent;
}

export interface VariantConfiguration {
  readonly weight: number;
  readonly stepSequence: readonly string[];
  readonly stepOverrides: Readonly<Record<string, StepOverride>>;
  readonly resultOverrides: Readonly<Record<string, ResultOverride>>;
}

export interface ExperimentConfiguration {
  readonly id: string;
  readonly assignment: 'server';
  readonly sticky: true;
  readonly overrideQueryParam: string;
  readonly variants: Readonly<Record<ExperimentVariant, VariantConfiguration>>;
}

export interface SessionConfiguration {
  readonly ttlHours: number;
  readonly persistAnswers: true;
  readonly pinVersion: true;
  readonly pinExperimentVariant: true;
}

export interface ProgressConfiguration {
  readonly countVisibleOnly: true;
  readonly excludeTypes: readonly StepType[];
}

export interface EventDeclaration {
  readonly name: string;
  readonly trigger: string;
  readonly properties: readonly string[];
}

export interface EventPrivacyConfiguration {
  readonly storeRawAnswers: false;
  readonly allowAnswerKinds: true;
}

export interface EventsConfiguration {
  readonly baseProperties: readonly string[];
  readonly allowed: readonly EventDeclaration[];
  readonly privacy: EventPrivacyConfiguration;
}

export interface FunnelConfiguration {
  readonly schemaVersion: '1.0';
  readonly funnelId: string;
  readonly version: number;
  readonly status: ConfigurationStatus;
  readonly locale: string;
  readonly title: string;
  readonly description: string;
  readonly releaseNote?: string;
  readonly session: SessionConfiguration;
  readonly progress: ProgressConfiguration;
  readonly experiment: ExperimentConfiguration;
  readonly steps: Readonly<Record<string, FunnelStep>>;
  readonly resultRules: readonly ResultRule[];
  readonly defaultResultId: string;
  readonly results: Readonly<Record<string, FunnelResult>>;
  readonly events: EventsConfiguration;
}

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
