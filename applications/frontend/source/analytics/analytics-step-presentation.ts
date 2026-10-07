import { AnalyticsContent } from './analytics-content';
import { CircleDot, Flag, Hash, Info, ListChecks } from 'lucide-react';
import { match } from 'ts-pattern';
import type { AnalyticsVariant } from '../management/management-types';

export const AnalyticsStepPresentation = {
  describe(stepType: AnalyticsVariant['steps'][number]['type']) {
    return match(stepType)
      .with('info', () => ({ icon: Info, label: AnalyticsContent.Information }))
      .with('single-select', () => ({ icon: CircleDot, label: AnalyticsContent.SingleChoice }))
      .with('multi-select', () => ({ icon: ListChecks, label: AnalyticsContent.MultipleChoice }))
      .with('number', () => ({ icon: Hash, label: AnalyticsContent.NumberInput }))
      .with('result', () => ({ icon: Flag, label: AnalyticsContent.Result }))
      .exhaustive();
  },
} as const;
