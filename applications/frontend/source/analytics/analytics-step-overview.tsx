import { isNull } from 'es-toolkit/predicate';
import { GitBranch, Flag, ListOrdered } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import { Badge } from '../components/badge';
import { Progress } from '../components/progress';
import type { AnalyticsVariant } from '../management/management-types';
import { AnalyticsFormat } from './analytics-format';

export function AnalyticsStepOverview({
  variant,
}: {
  readonly variant: AnalyticsVariant;
}): UIElement {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Where sessions reach</CardTitle>
        <CardDescription>
          Reach per started session for variant {variant.variant}. Conditional branches can skip
          steps; these bars are not a sequential drop-off funnel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex min-w-0 flex-col gap-5">
          {variant.steps.map((step, index) => {
            const reach = variant.started > 0 ? step.reached / variant.started : null;

            return (
              <li key={step.stepIdentifier} className="flex min-w-0 gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-xs text-muted-foreground">
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <span className="min-w-0 break-all text-sm font-medium">
                      {step.stepIdentifier}
                    </span>
                    <span className="text-sm tabular-nums">
                      {AnalyticsFormat.count(step.reached)}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {isNull(reach) ? 'No starts' : `${(reach * 100).toFixed(1)}% of starts`}
                      </span>
                    </span>
                  </div>
                  <Progress
                    value={isNull(reach) ? null : Math.min(100, reach * 100)}
                    aria-label={`${step.stepIdentifier}: share of started sessions reached`}
                    className="h-2"
                  />
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    {step.conditional && (
                      <Badge variant="outline">
                        <GitBranch />
                        Conditional
                      </Badge>
                    )}
                    {step.type === 'result' ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Flag className="size-3.5" />
                        Result reached
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1.5">
                          <ListOrdered className="size-3.5" />
                          {AnalyticsFormat.count(step.completed)} completed
                        </span>
                        <span>{AnalyticsFormat.count(step.noncompletion.open)} still open</span>
                        <span
                          className={
                            step.noncompletion.expired > 0 ? 'text-destructive' : undefined
                          }
                        >
                          {AnalyticsFormat.count(step.noncompletion.expired)} expired without
                          completion
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        {variant.steps.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No step data is available for this variant.
          </p>
        )}
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          Open sessions may continue. Expired counts are per step, not unique lost sessions.
        </p>
      </CardContent>
    </Card>
  );
}
