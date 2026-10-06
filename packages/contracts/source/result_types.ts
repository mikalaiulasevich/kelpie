import type { Condition } from './condition_types.js';

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

export interface ResultOverride {
  readonly title?: string;
  readonly summary?: string;
  readonly recommendations?: readonly string[];
  readonly cta?: PrimaryAction;
}

export interface ResultRule {
  readonly resultId: string;
  readonly when: Condition;
}
