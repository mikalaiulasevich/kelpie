import { AnalyticsContent } from './analytics-content';
import { useLocalization } from '../localization/use-localization';
import { isNull } from 'es-toolkit/predicate';
import {
  Activity,
  CheckCheck,
  ChevronDown,
  Clock3,
  Eye,
  GitBranch,
  Info,
  TimerOff,
} from 'lucide-react';
import { AnalyticsStepPresentation } from './analytics-step-presentation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import { Progress } from '../components/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/table';
import type { AnalyticsVariant } from '../management/management-types';
import { AnalyticsFormat } from './analytics-format';

interface AnalyticsStepOverviewProperties {
  readonly variant: AnalyticsVariant;
}

export function AnalyticsStepOverview({ variant }: AnalyticsStepOverviewProperties): UIElement {
  const { t: translate } = useLocalization();

  const conditionalSteps = variant.steps.filter((step) => step.conditional).length;
  const hasUnobservedCompletions = variant.steps.some(
    (step) => step.type !== 'result' && step.completed > step.completion.numerator,
  );

  return (
    <Card className="compact-card min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-4 text-primary" aria-hidden="true" />
          {translate(AnalyticsContent.StepReach)}
        </CardTitle>
        <CardDescription>
          {translate(AnalyticsContent.Variant)} {variant.variant} ·{' '}
          {AnalyticsFormat.count(variant.started)}{' '}
          {translate(AnalyticsContent.StartedBranchDescription)}
        </CardDescription>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-muted-foreground">
          <span>
            {variant.steps.length} {translate(AnalyticsContent.StepsUnit)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <GitBranch className="size-3.5" aria-hidden="true" />
            {conditionalSteps} {translate(AnalyticsContent.ConditionalStepsUnit)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye className="size-3.5" aria-hidden="true" />
            {translate(AnalyticsContent.RecordedReach)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {variant.started === 0 && (
          <p className="mb-4 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {translate(AnalyticsContent.EmptyReach)}
          </p>
        )}
        {hasUnobservedCompletions && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              <span className="font-medium text-foreground">
                {translate(AnalyticsContent.UnobservedCompletions)}
              </span>{' '}
              {translate(AnalyticsContent.ReachEvidence)}
            </p>
          </div>
        )}
        <Table className="step-reach-table">
          <caption className="sr-only">
            {translate(AnalyticsContent.ReachCaption)} {variant.variant}
          </caption>
          <TableHeader>
            <TableRow>
              <TableHead>{translate(AnalyticsContent.Step)}</TableHead>
              <TableHead>
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="size-3.5" aria-hidden="true" />
                  {translate(AnalyticsContent.Reached)}
                </span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {translate(AnalyticsContent.ViewsShare)}
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCheck className="size-3.5" aria-hidden="true" />
                  {translate(AnalyticsContent.Completed)}
                </span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {translate(AnalyticsContent.ConfirmedProgress)}
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-3.5" aria-hidden="true" />
                  {translate(AnalyticsContent.Open)}
                </span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {translate(AnalyticsContent.MayContinue)}
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1.5">
                  <TimerOff className="size-3.5" aria-hidden="true" />
                  {translate(AnalyticsContent.Expired)}
                </span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {translate(AnalyticsContent.WithoutCompletion)}
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variant.steps.map((step, index) => {
              const reach = variant.started > 0 ? step.reached / variant.started : null;
              const isResult = step.type === 'result';
              const presentation = AnalyticsStepPresentation.describe(step.type);
              const StepIcon = presentation.icon;

              return (
                <TableRow key={step.stepIdentifier}>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <StepIcon className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <span className="block break-words text-sm font-medium">
                          {step.stepIdentifier}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {index + 1} · {translate(presentation.label)}
                        </span>
                        {step.conditional && (
                          <span className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <GitBranch className="size-3" aria-hidden="true" />
                              {translate(AnalyticsContent.Conditional)}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-baseline justify-between gap-3 tabular-nums">
                      <span
                        className={step.reached === 0 ? 'text-muted-foreground' : 'font-medium'}
                      >
                        {AnalyticsFormat.count(step.reached)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {isNull(reach) ? '—' : AnalyticsFormat.percentage(reach)}
                      </span>
                    </div>
                    {!isNull(reach) && (
                      <Progress
                        value={Math.min(100, reach * 100)}
                        aria-label={translate(AnalyticsContent.StepReachLabel, {
                          step: step.stepIdentifier,
                        })}
                        className="mt-2 h-1"
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {isResult ? '—' : AnalyticsFormat.count(step.completed)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {isResult ? '—' : AnalyticsFormat.count(step.noncompletion.open)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {isResult ? '—' : AnalyticsFormat.count(step.noncompletion.expired)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {variant.steps.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">
            {translate(AnalyticsContent.EmptySteps)}
          </p>
        )}
        <details className="group mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm py-1 font-medium text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
            <Info className="size-3.5" aria-hidden="true" />
            {translate(AnalyticsContent.MetricHelp)}
            <ChevronDown
              className="ml-auto size-4 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="grid gap-3 pt-3 leading-relaxed sm:grid-cols-2">
            <p>
              <strong className="font-medium text-foreground">
                {translate(AnalyticsContent.ReachDefinitionTitle)}
              </strong>
              {translate(AnalyticsContent.ReachDefinition)}
            </p>
            <p>
              <strong className="font-medium text-foreground">
                {translate(AnalyticsContent.CompletionDefinitionTitle)}
              </strong>
              {translate(AnalyticsContent.CompletionDefinition)}
            </p>
            <p>
              <strong className="font-medium text-foreground">
                {translate(AnalyticsContent.OpenDefinitionTitle)}
              </strong>
              {translate(AnalyticsContent.OpenDefinition)}
            </p>
            <p>
              <strong className="font-medium text-foreground">
                {translate(AnalyticsContent.ExpiredDefinitionTitle)}
              </strong>
              {translate(AnalyticsContent.ExpiredDefinition)}
            </p>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
