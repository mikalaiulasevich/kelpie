import { vi } from 'vitest';
import { AnalyticsGoalCommand } from '../../source/analytics/analytics-goal-command';

export const AnalyticsGoalCommandFixture = {
  execution(operation: (signal: AbortSignal) => Promise<unknown>) {
    const cancellation = new AbortController();
    const onChanged = vi.fn<() => void>();

    return {
      cancellation,
      onChanged,
      run() {
        return AnalyticsGoalCommand.run({ operation, signal: cancellation.signal, onChanged });
      },
    };
  },
} as const;
