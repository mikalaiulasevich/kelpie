import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuizPreview } from '../../source/session/quiz-preview';
import { QuizSessionApi } from '../../source/session/quiz-session-api';
import { QuizPendingStorage } from '../../source/session/quiz-session-storage';
import { SessionFixtures } from '../fixtures/session-fixtures';

describe('isolated administrator preview transport', () => {
  beforeEach(() => {
    SessionFixtures.storage();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('cannot start a normal session from a preview URL', async () => {
    vi.stubGlobal('window', { location: { search: '?preview=1' } });
    const request = vi.fn();
    vi.stubGlobal('fetch', request);
    await expect(QuizSessionApi.send('/api/sessions', {})).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });

  it('keeps normal pending commands while preview commands are written', () => {
    const normal = { path: '/api/sessions', body: { operationIdentifier: 'normal' } };
    const preview = {
      path: '/api/sessions/current/continue',
      body: { operationIdentifier: 'preview' },
    };
    vi.spyOn(QuizPreview, 'active').mockReturnValue(false);
    QuizPendingStorage.write(normal);
    vi.mocked(QuizPreview.active).mockReturnValue(true);
    QuizPendingStorage.write(preview);
    expect(QuizPendingStorage.read()).toEqual(preview);
    vi.mocked(QuizPreview.active).mockReturnValue(false);
    expect(QuizPendingStorage.read()).toEqual(normal);
  });

  it('adds preview routing only to the preview tab', async () => {
    vi.stubGlobal('window', { location: { search: '?preview=1' } });
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', request);
    await QuizSessionApi.send('/api/sessions/current');
    expect(request).toHaveBeenCalledWith(
      '/api/sessions/current',
      expect.objectContaining({ headers: expect.objectContaining({ 'X-Kelpie-Preview': '1' }) }),
    );
  });
});
