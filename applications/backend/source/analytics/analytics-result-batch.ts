import { isUndefined } from 'es-toolkit/predicate';
import { AnalyticsMessages } from './analytics-messages.js';

/** Consumes each statement's result in preparation order, rejecting malformed batch envelopes. */
export class AnalyticsResultBatch {
  private position = 0;

  constructor(
    private readonly results: readonly unknown[][],
    expectedCount: number,
  ) {
    if (results.length !== expectedCount) {
      throw new Error(AnalyticsMessages.InvalidAggregateBatch);
    }
  }

  next(): readonly unknown[] {
    const rows = this.results[this.position];

    if (isUndefined(rows)) {
      throw new Error(AnalyticsMessages.InvalidAggregateBatch);
    }

    this.position += 1;

    return rows;
  }
}
