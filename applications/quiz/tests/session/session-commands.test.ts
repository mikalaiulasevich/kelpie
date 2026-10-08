import { describe, expect, it, vi } from 'vitest';
import { QuizSessionCommands } from '../../source/session/quiz-session-commands';
import { QuizRequestError, QuizSessionFailures } from '../../source/session/quiz-session-failures';
import { SessionFixtures } from '../fixtures/session-fixtures';
import { SessionCommandCases } from '../cases/session-command-cases';

// Serialized expectations deliberately do not reference route or policy constants.
describe('Quiz session command boundaries', () => {
  it.each(SessionCommandCases.Navigation)(
    'preserves $name intent and session ownership',
    (scenario) => {
      const state = {
        ...SessionFixtures.state(),
        currentStepIdentifier: scenario.stepIdentifier,
        revision: 3,
      };
      const timestamp = '2026-10-07T12:00:00.000Z';
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000002');
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(timestamp);

      const command = QuizSessionCommands.navigate(state, scenario.direction, scenario.answer);

      expect(command).toEqual({
        path: `/api/sessions/current/${scenario.endpoint}`,
        sessionIdentifier: state.sessionIdentifier,
        body: {
          operationIdentifier: '00000000-0000-4000-8000-000000000002',
          expectedSessionRevision: 3,
          stepIdentifier: scenario.stepIdentifier,
          clientTimestamp: timestamp,
          ...(scenario.endpoint === 'answers' ? { answer: 12 } : {}),
        },
      });
    },
  );

  it.each(SessionCommandCases.Queries)('preserves creation query $query', ({ query, path }) => {
    const command = QuizSessionCommands.create('workstyle-planner', query);

    expect(command.path).toBe(path);
    expect(command.body.funnelIdentifier).toBe('workstyle-planner');
    expect(command.sessionIdentifier).toBeUndefined();
  });

  it('distinguishes retryable network/server failures from rejected commands', () => {
    expect(QuizSessionFailures.isRejectedCommand(new TypeError('Network unavailable'))).toBe(false);
    expect(QuizSessionFailures.isRejectedCommand(new QuizRequestError(500))).toBe(false);
    expect(QuizSessionFailures.isRejectedCommand(new QuizRequestError(400))).toBe(true);
    expect(QuizSessionFailures.requiresRestore(new QuizRequestError(400))).toBe(false);
  });

  it.each(SessionCommandCases.RestoreStatuses)('refreshes ownership after HTTP %s', (status) => {
    expect(QuizSessionFailures.requiresRestore(new QuizRequestError(status))).toBe(true);
  });

  it.each(SessionCommandCases.Recovery)(
    'reports $name without disabling a recovered expired-session start',
    (scenario) => {
      const restored = SessionFixtures.recoveredEnvelope(scenario.outcome);
      const failure = new QuizRequestError(scenario.status);

      expect(QuizSessionFailures.recoveryMessage(failure, restored)).toBe(scenario.expected);
    },
  );
});
