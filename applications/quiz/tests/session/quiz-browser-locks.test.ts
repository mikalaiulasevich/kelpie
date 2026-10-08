import { describe, expect, it } from 'vitest';
import { QuizBrowserLocks } from '../../source/session/quiz-browser-locks';

describe('browser lock failure cleanup', () => {
  it('releases a native lock after synchronous storage failure before a retry', async () => {
    const name = `quiz-lock-failure-${crypto.randomUUID()}`;
    await expect(
      QuizBrowserLocks.run(name, () => {
        throw new DOMException('Storage is full', 'QuotaExceededError');
      }),
    ).rejects.toThrow('Storage is full');
    await expect(QuizBrowserLocks.run(name, () => 'recovered')).resolves.toBe('recovered');
  });
});
