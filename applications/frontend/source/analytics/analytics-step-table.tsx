import { isNull } from 'es-toolkit/predicate';
import { Badge } from '../components/badge';
import { AnalyticsContent } from './analytics-content';
import { useLocalization } from '../localization/use-localization';
import type { AnalyticsVariant } from '../management/management-types';
import { AnalyticsFormat } from './analytics-format';
import { AnalyticsRatioValue } from './analytics-ratio-value';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/table';

import { AnalyticsStepPresentation } from './analytics-step-presentation';
import { Progress } from '../components/progress';
import { GitBranch } from 'lucide-react';

interface AnalyticsStepTableProperties {
  readonly variant: AnalyticsVariant;
}

export function AnalyticsStepTable({ variant }: AnalyticsStepTableProperties) {
  const { t: translate } = useLocalization();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {translate(AnalyticsContent.Variant)} {variant.variant}{' '}
          {translate(AnalyticsContent.VariantSteps)}
        </CardTitle>
        <CardDescription>{translate(AnalyticsContent.StepsDescription)}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>{translate(AnalyticsContent.StepsCaption)}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>{translate(AnalyticsContent.Step)}</TableHead>
              <TableHead>{translate(AnalyticsContent.Reached)}</TableHead>
              <TableHead>{translate(AnalyticsContent.Completed)}</TableHead>
              <TableHead>{translate(AnalyticsContent.Completion)}</TableHead>
              <TableHead>{translate(AnalyticsContent.Open)}</TableHead>
              <TableHead>{translate(AnalyticsContent.Expired)}</TableHead>
              <TableHead>{translate(AnalyticsContent.ExpiredDropout)}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variant.steps.map((step, index) => {
              const presentation = AnalyticsStepPresentation.describe(step.type);
              const StepIcon = presentation.icon;

              return (
                <TableRow key={step.stepIdentifier} className="transition-colors duration-150">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary tabular-nums">
                        {index + 1}
                      </span>
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="font-medium leading-snug">{step.stepIdentifier}</span>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <StepIcon className="size-3.5" aria-hidden="true" />
                            {translate(presentation.label)}
                          </span>
                          {step.conditional && (
                            <span className="inline-flex items-center gap-1.5">
                              <GitBranch className="size-3.5" aria-hidden="true" />
                              {translate(AnalyticsContent.Conditional)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {AnalyticsFormat.count(step.reached)}
                  </TableCell>
                  {step.type === 'result' ? (
                    <TableCell colSpan={5}>
                      <Badge variant="success">{translate(AnalyticsContent.TerminalReach)}</Badge>
                    </TableCell>
                  ) : (
                    <>
                      <TableCell className="tabular-nums">
                        {AnalyticsFormat.count(step.completed)}
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-24 flex-col gap-2">
                          <AnalyticsRatioValue ratio={step.completion} tone="positive" />
                          {!isNull(step.completion.value) && (
                            <Progress
                              className="h-1 bg-success/15 [&_[data-slot=progress-indicator]]:bg-success"
                              value={step.completion.value * 100}
                              aria-label={translate(AnalyticsContent.StepCompletionLabel, {
                                step: step.stepIdentifier,
                              })}
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell
                        data-nonzero={step.noncompletion.open > 0}
                        className="tabular-nums data-[nonzero=true]:text-warning"
                      >
                        {AnalyticsFormat.count(step.noncompletion.open)}
                      </TableCell>
                      <TableCell
                        data-nonzero={step.noncompletion.expired > 0}
                        className="font-medium tabular-nums data-[nonzero=true]:text-destructive"
                      >
                        {AnalyticsFormat.count(step.noncompletion.expired)}
                      </TableCell>
                      <TableCell>
                        <AnalyticsRatioValue ratio={step.expiredDropout} tone="negative" />
                      </TableCell>
                    </>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
