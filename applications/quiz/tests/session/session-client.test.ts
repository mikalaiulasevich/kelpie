import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  QuizDrafts,
  QuizSessionApi,
  QuizPendingStorage,
} from '../../source/session/quiz-session-api';
import { QuizObservations } from '../../source/session/quiz-observations';
import { QuizObservationDelivery } from '../../source/session/quiz-observation-delivery';
import { SessionFixtures } from '../fixtures/session-fixtures';

describe('Quiz session browser persistence', () => {
  beforeEach(() => {
    SessionFixtures.storage();
  });

  it('keeps unfinished drafts local and isolates them by session and step', () => {
    const state = SessionFixtures.state();
    const request = vi.spyOn(QuizSessionApi, 'request');
    QuizDrafts.write(state, 'team_size', 12);

    expect(QuizDrafts.read(state, 'team_size')).toBe(12);
    expect(
      QuizDrafts.read({ ...state, sessionIdentifier: 'another' }, 'team_size'),
    ).toBeUndefined();
    expect(request).not.toHaveBeenCalled();
    QuizDrafts.remove(state, 'team_size');
    expect(QuizDrafts.read(state, 'team_size')).toBeUndefined();
  });

  it('retains identical operation intent across browser reopening', () => {
    const command = {
      path: '/api/sessions/current/answers',
      body: {
        operationIdentifier: 'stable',
        expectedSessionRevision: 3,
        stepIdentifier: 'team_size',
        answer: 12,
      },
    };
    QuizPendingStorage.write(command);

    expect(QuizPendingStorage.read()).toEqual(command);
  });

  it('keeps observation identifiers after uncertain delivery and removes acknowledged events only', async () => {
    const state = SessionFixtures.state();
    await QuizObservations.view(state);
    const queued = QuizObservations.read(state);
    vi.spyOn(QuizSessionApi, 'request').mockRejectedValueOnce(new TypeError('Offline'));

    await expect(QuizObservations.flush(state)).rejects.toThrow('Offline');
    expect(QuizObservations.read(state)).toEqual(queued);
    vi.spyOn(QuizSessionApi, 'request').mockResolvedValueOnce({
      receipts: queued.map((event) => ({ event_id: event.event_id, status: 'duplicate' })),
    });
    await QuizObservations.flush(state);
    expect(QuizObservations.read(state)).toEqual([]);
  });

  it('rejects malformed server envelopes before rendering', async () => {
    vi.spyOn(QuizSessionApi, 'request').mockResolvedValue({ state: {}, expired: false });

    await expect(QuizSessionApi.current()).rejects.toThrow();
  });

  it('keeps the authoritative result content returned by the server', () => {
    const state = SessionFixtures.state();
    const result = {
      id: 'authoritative',
      title: 'Server result',
      summary: 'Pinned content',
      recommendations: ['One recommendation'],
      cta: { label: 'Read more', action: 'expand_recommendation' },
    };

    expect(QuizSessionApi.parse({ ...state, result }).result).toEqual(result);
  });

  it('discards pending intent after revision changes or ownership changes', () => {
    const state = SessionFixtures.state();
    const command = {
      path: '/api/sessions/current/continue',
      sessionIdentifier: state.sessionIdentifier,
      body: {
        operationIdentifier: 'stable',
        expectedSessionRevision: state.revision,
        stepIdentifier: state.currentStepIdentifier,
      },
    };
    QuizPendingStorage.write(command);
    expect(QuizPendingStorage.restore(state)).toEqual(command);
    expect(QuizPendingStorage.restore({ ...state, revision: state.revision + 1 })).toBeNull();
    expect(QuizPendingStorage.read()).toBeNull();
    QuizPendingStorage.write(command);
    expect(QuizPendingStorage.restore({ ...state, sessionIdentifier: 'another' })).toBeNull();
  });

  it('does not replay an old create command after a session is restored', () => {
    const command = {
      path: '/api/sessions?variant=A',
      body: { operationIdentifier: 'stable', funnelIdentifier: 'workstyle-planner' },
    };
    QuizPendingStorage.write(command);
    expect(QuizPendingStorage.restore(null)).toEqual(command);
    expect(QuizPendingStorage.restore(SessionFixtures.state())).toBeNull();
    expect(QuizPendingStorage.read()).toBeNull();
  });

  it('clears only the submitted draft and retains a newer edit or the next step draft', () => {
    const state = SessionFixtures.state();
    const command = {
      path: '/api/sessions/current/answers',
      sessionIdentifier: state.sessionIdentifier,
      body: { stepIdentifier: 'team_size', answer: 12 },
    };
    QuizDrafts.write(state, 'team_size', 24);
    QuizDrafts.write(state, 'work_mode', 'hybrid');
    QuizPendingStorage.confirmDraft(state, command);
    expect(QuizDrafts.read(state, 'team_size')).toBe(24);
    QuizDrafts.write(state, 'team_size', 12);
    QuizPendingStorage.confirmDraft({ ...state, currentStepIdentifier: 'work_mode' }, command);
    expect(QuizDrafts.read(state, 'team_size')).toBeUndefined();
    expect(QuizDrafts.read(state, 'work_mode')).toBe('hybrid');
  });

  it('removes permanent rejections without retrying them and retains the delivery warning', async () => {
    const state = SessionFixtures.state();
    await QuizObservations.view(state);
    const queued = QuizObservations.read(state);
    const request = vi.spyOn(QuizSessionApi, 'request').mockResolvedValue({
      receipts: queued.map((event) => ({ event_id: event.event_id, status: 'rejected' })),
    });
    await expect(QuizObservations.flush(state)).rejects.toThrow('could not be accepted');
    expect(QuizObservations.read(state)).toEqual([]);
    await expect(QuizObservations.flush(state)).rejects.toThrow('could not be accepted');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('does not claim a view was queued when browser storage fails and can retry', async () => {
    const storage = SessionFixtures.storage();
    const state = SessionFixtures.state();
    storage.setItem.mockImplementationOnce(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    await expect(QuizObservations.view(state)).rejects.toThrow('Quota exceeded');
    expect(QuizObservations.read(state)).toEqual([]);
    await QuizObservations.view(state);
    expect(QuizObservations.read(state)).toHaveLength(1);
  });
  it('drains a full observation queue before recording the current view', async () => {
    const state = SessionFixtures.state();
    await SessionFixtures.queuedViews(state, 200);
    const previousIdentifiers = new Set(
      QuizObservations.read(state).map((event) => event.event_id),
    );
    const request = SessionFixtures.acknowledgeEvents(state);
    const delivery = new QuizObservationDelivery(state);

    await delivery.flush();

    const remaining = QuizObservations.read(state);
    expect(request).toHaveBeenCalledTimes(2);
    expect(remaining).toHaveLength(141);
    expect(remaining.filter((event) => !previousIdentifiers.has(event.event_id))).toHaveLength(1);
  });

  it('queues the current view while offline and does not duplicate it on delivery retry', async () => {
    const state = SessionFixtures.state();
    await SessionFixtures.queuedViews(state, 1);
    const request = vi
      .spyOn(QuizSessionApi, 'request')
      .mockRejectedValueOnce(new TypeError('Offline'));
    const delivery = new QuizObservationDelivery(state);

    await expect(delivery.flush()).rejects.toThrow('Offline');
    const queued = QuizObservations.read(state);
    expect(queued).toHaveLength(2);
    request.mockResolvedValueOnce({
      receipts: queued.map((event) => ({ event_id: event.event_id, status: 'accepted' })),
    });

    await delivery.flush();

    expect(QuizObservations.read(state)).toEqual([]);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('queues result view events atomically when capacity is exhausted', async () => {
    const state = SessionFixtures.resultState();
    await SessionFixtures.queuedViews(state, 199);
    const queued = QuizObservations.read(state);

    await expect(QuizObservations.view(state)).rejects.toThrow('waiting to sync');

    expect(QuizObservations.read(state)).toEqual(queued);
    SessionFixtures.acknowledgeEvents(state);
    await QuizObservations.flush(state);
    await QuizObservations.view(state);
    expect(
      QuizObservations.read(state)
        .slice(-2)
        .map((event) => event.name),
    ).toEqual(['step_viewed', 'result_viewed']);
  });
});
