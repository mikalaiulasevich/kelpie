import { QuizObservations } from './quiz-observations';
import type { QuizSessionState } from './quiz-session-types';

export class QuizObservationDelivery {
  private viewQueued = false;

  constructor(private readonly state: QuizSessionState) {}

  matches(state: QuizSessionState): boolean {
    return (
      this.state.sessionIdentifier === state.sessionIdentifier &&
      this.state.revision === state.revision
    );
  }

  async flush(): Promise<void> {
    try {
      // Drain older events before adding a view so a full queue can recover.
      await QuizObservations.flush(this.state);
    } finally {
      // An unavailable network must not prevent recording the current view locally.
      if (!this.viewQueued) {
        await QuizObservations.view(this.state);
        this.viewQueued = true;
      }
    }

    await QuizObservations.flush(this.state);
  }
}
