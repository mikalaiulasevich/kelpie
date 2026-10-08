import { describe, expect, it } from 'vitest';
import { AnalyticsResultBatch } from '../../source/analytics/analytics-result-batch.js';

describe('analytics result batch integrity', () => {
  it('rejects missing and extra result sets before consuming rows', () => {
    expect(() => new AnalyticsResultBatch([[]], 2)).toThrow(
      'Analytics aggregate batch is invalid.',
    );
    expect(() => new AnalyticsResultBatch([[], []], 1)).toThrow(
      'Analytics aggregate batch is invalid.',
    );
  });

  it('consumes results in order and rejects reading past the final statement', () => {
    const batch = new AnalyticsResultBatch([[{ started: 2 }], []], 2);

    expect(batch.next()).toEqual([{ started: 2 }]);
    expect(batch.next()).toEqual([]);
    expect(() => batch.next()).toThrow('Analytics aggregate batch is invalid.');
  });
});
