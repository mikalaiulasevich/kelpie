export type ExperimentVariant = 'A' | 'B';
export type StepType = 'info' | 'single-select' | 'multi-select' | 'number' | 'result';
export type StepAnswer = string | number | readonly string[];
export type SessionAnswers = Readonly<Record<string, StepAnswer>>;

export type Condition =
  | { readonly all: readonly Condition[] }
  | { readonly any: readonly Condition[] }
  | { readonly answer: string; readonly operator: 'eq'; readonly value: string | number }
  | {
      readonly answer: string;
      readonly operator: 'in';
      readonly value: readonly (string | number)[];
    }
  | { readonly answer: string; readonly operator: 'contains'; readonly value: string }
  | { readonly answer: string; readonly operator: 'gte'; readonly value: number };

export interface StepContent {
  readonly title?: string;
  readonly helperText?: string;
  readonly eyebrow?: string;
  readonly body?: string;
  readonly primaryActionLabel?: string;
  readonly loadingTitle?: string;
  readonly errorTitle?: string;
  readonly retryLabel?: string;
}

export interface AnswerValidation {
  readonly required: boolean;
  readonly minSelections?: number;
  readonly maxSelections?: number;
  readonly messages: Readonly<Record<string, string>>;
}

interface StepBase {
  readonly id: string;
  readonly content: StepContent;
  readonly visibleWhen?: Condition;
}

export interface InformationStep extends StepBase {
  readonly type: 'info';
}
export interface ResultStep extends StepBase {
  readonly type: 'result';
  readonly resultSource: 'resultRules';
}
export interface NumberStep extends StepBase {
  readonly type: 'number';
  readonly input: {
    readonly name: string;
    readonly min: number;
    readonly max: number;
    readonly step: number;
    readonly unit?: string;
  };
  readonly validation: AnswerValidation;
}
export interface SelectionOption {
  readonly value: string;
  readonly label: string;
}
export interface SelectionStep extends StepBase {
  readonly type: 'single-select' | 'multi-select';
  readonly input: { readonly name: string; readonly options: readonly SelectionOption[] };
  readonly validation: AnswerValidation;
}
export type FunnelStep = InformationStep | ResultStep | NumberStep | SelectionStep;

export interface PrimaryAction {
  readonly label: string;
  readonly action: 'expand_recommendation';
}
export interface FunnelResult {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly recommendations: readonly string[];
  readonly cta: PrimaryAction;
}
export interface VariantConfiguration {
  readonly weight: number;
  readonly stepSequence: readonly string[];
  readonly stepOverrides: Readonly<Record<string, { readonly content: StepContent }>>;
  readonly resultOverrides: Readonly<
    Record<
      string,
      {
        readonly title?: string;
        readonly summary?: string;
        readonly recommendations?: readonly string[];
        readonly cta?: PrimaryAction;
      }
    >
  >;
}
export interface EventDeclaration {
  readonly name: string;
  readonly trigger: string;
  readonly properties: readonly string[];
}
export interface FunnelConfiguration {
  readonly schemaVersion: '1.0';
  readonly funnelId: string;
  readonly version: number;
  readonly status: 'draft' | 'published';
  readonly locale: string;
  readonly title: string;
  readonly description: string;
  readonly releaseNote?: string;
  readonly session: {
    readonly ttlHours: number;
    readonly persistAnswers: true;
    readonly pinVersion: true;
    readonly pinExperimentVariant: true;
  };
  readonly progress: {
    readonly countVisibleOnly: true;
    readonly excludeTypes: readonly StepType[];
  };
  readonly experiment: {
    readonly id: string;
    readonly assignment: 'server';
    readonly sticky: true;
    readonly overrideQueryParam: string;
    readonly variants: Readonly<Record<ExperimentVariant, VariantConfiguration>>;
  };
  readonly steps: Readonly<Record<string, FunnelStep>>;
  readonly resultRules: readonly { readonly resultId: string; readonly when: Condition }[];
  readonly defaultResultId: string;
  readonly results: Readonly<Record<string, FunnelResult>>;
  readonly events: {
    readonly baseProperties: readonly string[];
    readonly allowed: readonly EventDeclaration[];
    readonly privacy: { readonly storeRawAnswers: false; readonly allowAnswerKinds: true };
  };
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
  | { readonly valid: false; readonly issues: readonly ConfigurationIssue[] };
