import { isUndefined } from 'es-toolkit/predicate';
import type {
  ExperimentVariant,
  FunnelConfiguration,
  FunnelStep,
  SessionAnswers,
  StepAnswer,
  VariantConfiguration,
} from '@kelpie/contracts';
import { RouteSteps } from './route-steps.js';
import type { AcceptedStepAnswer, EvaluatedRoute } from './route-types.js';

/** A new builder owns each traversal; answers never leak between resolutions. */
export class RouteBuilder {
  private readonly steps: FunnelStep[] = [];
  private readonly activeAnswers: Dictionary<string, StepAnswer> = {};
  private readonly selectedVariant: VariantConfiguration;
  private isComplete = true;
  private questionCount = 0;
  private completedQuestionCount = 0;

  private constructor(
    private readonly configuration: FunnelConfiguration,
    variant: ExperimentVariant,
    private readonly answers: SessionAnswers,
  ) {
    this.selectedVariant = configuration.experiment.variants[variant];
  }

  static resolve(
    configuration: FunnelConfiguration,
    variant: ExperimentVariant,
    answers: SessionAnswers,
  ): EvaluatedRoute {
    return new RouteBuilder(configuration, variant, answers).build();
  }

  private build(): EvaluatedRoute {
    for (const identifier of this.selectedVariant.stepSequence) {
      const step = RouteSteps.resolve(this.configuration, this.selectedVariant, identifier);
      this.visit(step);
    }

    return this.snapshot();
  }

  private visit(step: FunnelStep): void {
    if (!RouteSteps.isVisible(step, this.activeAnswers)) {
      return;
    }

    this.steps.push(step);
    const evaluation = RouteSteps.evaluateAnswer(step, this.answers);
    this.isComplete = this.isComplete && evaluation.isComplete;
    this.activateAnswer(evaluation.acceptedAnswer);
    this.updateProgress(step, !isUndefined(evaluation.acceptedAnswer));
  }

  private activateAnswer(answer: Optional<AcceptedStepAnswer>): void {
    if (!isUndefined(answer)) {
      this.activeAnswers[answer.name] = answer.value;
    }
  }

  private updateProgress(step: FunnelStep, completed: boolean): void {
    if (this.configuration.progress.excludeTypes.includes(step.type)) {
      return;
    }

    this.questionCount += 1;

    if (completed) {
      this.completedQuestionCount += 1;
    }
  }

  private snapshot(): EvaluatedRoute {
    return {
      route: {
        steps: this.steps,
        activeAnswers: this.activeAnswers,
        questionCount: this.questionCount,
        completedQuestionCount: this.completedQuestionCount,
      },
      isComplete: this.isComplete,
    };
  }
}
