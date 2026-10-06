import type {
  ExperimentVariant,
  FunnelConfiguration,
  FunnelStep,
  SessionAnswers,
  StepAnswer,
  StepType,
  VariantConfiguration,
} from '@kelpie/contracts';
import { RouteSteps } from './route-steps.js';
import type { AvailableRoute } from './runtime-types.js';

/** A new builder owns each traversal; answers never leak between resolutions. */
export class RouteBuilder {
  private readonly steps: FunnelStep[] = [];
  private readonly activeAnswers: Record<string, StepAnswer> = {};
  private readonly selectedVariant: VariantConfiguration;
  private readonly excludedTypes: ReadonlySet<StepType>;
  private questionCount = 0;
  private completedQuestionCount = 0;

  private constructor(
    private readonly configuration: FunnelConfiguration,
    variant: ExperimentVariant,
    private readonly answers: SessionAnswers,
  ) {
    this.selectedVariant = configuration.experiment.variants[variant];
    this.excludedTypes = new Set(configuration.progress.excludeTypes);
  }

  static resolve(
    configuration: FunnelConfiguration,
    variant: ExperimentVariant,
    answers: SessionAnswers,
  ): AvailableRoute {
    return new RouteBuilder(configuration, variant, answers).build();
  }

  private build(): AvailableRoute {
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
    const completed = this.activateAnswer(step);
    this.updateProgress(step, completed);
  }

  private activateAnswer(step: FunnelStep): boolean {
    const answer = RouteSteps.acceptedAnswer(step, this.answers);

    if (answer === undefined) {
      return false;
    }

    this.activeAnswers[answer.name] = answer.value;

    return true;
  }

  private updateProgress(step: FunnelStep, completed: boolean): void {
    if (this.excludedTypes.has(step.type)) {
      return;
    }

    this.questionCount += 1;

    if (completed) {
      this.completedQuestionCount += 1;
    }
  }

  private snapshot(): AvailableRoute {
    return {
      steps: this.steps,
      activeAnswers: this.activeAnswers,
      questionCount: this.questionCount,
      completedQuestionCount: this.completedQuestionCount,
    };
  }
}
