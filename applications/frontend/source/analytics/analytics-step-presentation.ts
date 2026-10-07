import { CircleDot, Flag, Hash, Info, ListChecks } from 'lucide-react';
import { match } from 'ts-pattern';
import type { AnalyticsVariant } from '../management/management-types';

export const AnalyticsStepPresentation = {
  describe(type: AnalyticsVariant['steps'][number]['type']) {
    return match(type)
      .with('info', () => ({ icon: Info, label: 'Information' }))
      .with('single-select', () => ({ icon: CircleDot, label: 'Single choice' }))
      .with('multi-select', () => ({ icon: ListChecks, label: 'Multiple choice' }))
      .with('number', () => ({ icon: Hash, label: 'Number input' }))
      .with('result', () => ({ icon: Flag, label: 'Result' }))
      .exhaustive();
  },
} as const;
