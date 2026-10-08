import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuizObservations } from '../../source/session/quiz-observations';
import { QuizSessionApi } from '../../source/session/quiz-session-api';
import { ObservationReceiptCases } from '../cases/observation-receipt-cases';
import { SessionFixtures } from '../fixtures/session-fixtures';

describe('Observation acknowledgement durability', () => {
  beforeEach(() => {
    SessionFixtures.storage();
  });

  it.each(ObservationReceiptCases.InvalidBatches)(
    'retains the full submitted batch after $name',
    async ({ indexes }) => {
      const state = SessionFixtures.state();
      await SessionFixtures.queuedViews(state, 2);
      const queued = QuizObservations.read(state);
      vi.spyOn(QuizSessionApi, 'request').mockResolvedValue({
        receipts: indexes.map((index) => ({
          event_id: queued[index]?.event_id,
          status: 'accepted',
        })),
      });

      await expect(QuizObservations.flush(state)).rejects.toThrow('waiting to sync');

      expect(QuizObservations.read(state)).toEqual(queued);
    },
  );

  it('does not remove a newly queued event acknowledged outside the submitted batch', async () => {
    const state = SessionFixtures.state();
    await SessionFixtures.queuedViews(state, 1);
    const queued = QuizObservations.read(state);
    vi.spyOn(QuizSessionApi, 'request').mockImplementation(async () => {
      await QuizObservations.view(state);

      return {
        receipts: [{ event_id: QuizObservations.read(state)[1]?.event_id, status: 'accepted' }],
      };
    });

    await expect(QuizObservations.flush(state)).rejects.toThrow('waiting to sync');

    expect(QuizObservations.read(state)).toHaveLength(2);
    expect(QuizObservations.read(state)[0]).toEqual(queued[0]);
  });

  it('retains rejected events if storing the rejection warning fails', async () => {
    const storage = SessionFixtures.storage();
    const state = SessionFixtures.state();
    await QuizObservations.view(state);
    const queued = QuizObservations.read(state);
    vi.spyOn(QuizSessionApi, 'request').mockResolvedValue({
      receipts: queued.map((event) => ({ event_id: event.event_id, status: 'rejected' })),
    });
    storage.setItem.mockImplementationOnce(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    await expect(QuizObservations.flush(state)).rejects.toThrow('Quota exceeded');
    expect(QuizObservations.read(state)).toEqual(queued);

    await expect(QuizObservations.flush(state)).rejects.toThrow('could not be accepted');
    expect(QuizObservations.read(state)).toEqual([]);
    await expect(QuizObservations.flush(state)).rejects.toThrow('could not be accepted');
  });

  it('keeps new observations when overlapping flushes acknowledge the same submitted batch', async () => {
    const state = SessionFixtures.state();
    await QuizObservations.view(state);
    const queued = QuizObservations.read(state);
    const request = vi.spyOn(QuizSessionApi, 'request').mockResolvedValue({
      receipts: queued.map((event) => ({ event_id: event.event_id, status: 'duplicate' })),
    });

    const firstFlush = QuizObservations.flush(state);
    const secondFlush = QuizObservations.flush(state);
    await QuizObservations.view(state);
    const addedObservation = QuizObservations.read(state).find(
      (event) => event.event_id !== queued[0]?.event_id,
    );
    await Promise.all([firstFlush, secondFlush]);

    expect(request).toHaveBeenCalledTimes(2);
    expect(addedObservation).toBeDefined();
    expect(QuizObservations.read(state)).toEqual([addedObservation]);
  });

  it('retains accepted events if writing the reduced queue fails and retries identical identifiers', async () => {
    const storage = SessionFixtures.storage();
    const state = SessionFixtures.state();
    await QuizObservations.view(state);
    const queued = QuizObservations.read(state);
    const request = SessionFixtures.acknowledgeEvents(state);
    storage.setItem.mockImplementationOnce(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    await expect(QuizObservations.flush(state)).rejects.toThrow('Quota exceeded');
    expect(QuizObservations.read(state)).toEqual(queued);
    await QuizObservations.flush(state);

    expect(QuizObservations.read(state)).toEqual([]);
    expect(request).toHaveBeenNthCalledWith(1, '/api/events/batches', { events: queued });
    expect(request).toHaveBeenNthCalledWith(2, '/api/events/batches', { events: queued });
  });
});
