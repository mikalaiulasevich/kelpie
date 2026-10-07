import { AnalyticsMarketingOverview } from './analytics-marketing-overview';
import { AnalyticsStepOverview } from './analytics-step-overview';
import { DeferredView } from '../application/deferred-view';
import { lazy } from 'react';
import { isNull } from 'es-toolkit/predicate';
import { SkeletonChart } from '../components/skeleton';
import {
  GitBranch,
  MousePointer2,
  Users,
  ListOrdered,
  Route,
  FlaskConical,
  Info,
  CircleCheck,
  ArrowUpRight,
} from 'lucide-react';
import { Alert, AlertDescription } from '../components/alert';
import { Progress } from '../components/progress';
import { Button } from '../components/button';
import { Badge } from '../components/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../components/empty';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/tabs';
import type {
  AnalyticsRatio,
  AnalyticsVariant,
  AnalyticsVersion,
} from '../management/management-types';
import { AnalyticsFormat } from './analytics-format';
import { ClassNames } from '../styling/combine-class-names';

const AnalyticsComparisonChart = lazy(() =>
  import('./analytics-comparison-chart').then((module) => ({
    default: module.AnalyticsComparisonChart,
  })),
);

function AnalyticsRatioValue({
  ratio,
  tone = 'neutral',
}: {
  readonly ratio: AnalyticsRatio;
  readonly tone?: 'neutral' | 'positive' | 'negative';
}) {
  return (
    <div className="flex flex-col gap-1">
      <span
        data-tone={ratio.numerator > 0 ? tone : 'neutral'}
        className="font-semibold tabular-nums data-[tone=positive]:text-success data-[tone=negative]:text-destructive"
      >
        {AnalyticsFormat.ratio(ratio)}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {AnalyticsFormat.fraction(ratio)}
      </span>
    </div>
  );
}

function AnalyticsVariantSummary({ variant }: { readonly variant: AnalyticsVariant }) {
  return (
    <Card className="analytics-metric gap-4 overflow-hidden py-0" data-variant={variant.variant}>
      <CardHeader className="flex flex-row items-center gap-3 pt-4">
        <div className="flex items-center gap-3">
          <span
            className={ClassNames.combine(
              'flex size-9 items-center justify-center rounded-lg text-sm font-semibold',
              variant.variant === 'A' ? 'bg-primary/12 text-primary' : 'bg-info/12 text-info',
            )}
          >
            {variant.variant}
          </span>
          <div className="flex flex-col gap-1">
            <CardTitle>Variant {variant.variant}</CardTitle>
            <CardDescription className="text-xs">
              {variant.steps.length} steps · {variant.edges.length} paths
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <MousePointer2 className="size-3.5" />
            CTA conversion · primary
          </span>
          <p
            data-applicable={!isNull(variant.ctaConversion.value)}
            data-positive={variant.ctaConversion.numerator > 0}
            className="text-[2.5rem] leading-none font-semibold tracking-tight tabular-nums data-[applicable=false]:text-lg"
          >
            {AnalyticsFormat.ratio(variant.ctaConversion)}
          </p>
          <span className="text-xs text-muted-foreground tabular-nums">
            {AnalyticsFormat.fraction(variant.ctaConversion)}
          </span>
          {!isNull(variant.ctaConversion.value) && (
            <Progress
              className="analytics-metric-progress mt-2 h-1"
              value={variant.ctaConversion.value * 100}
              aria-label={`Variant ${variant.variant} CTA conversion`}
            />
          )}
        </div>
        <div className="flex flex-col items-end gap-2 border-l pl-5">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            Started
          </span>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {AnalyticsFormat.count(variant.started)}
          </p>
          <span className="text-xs text-muted-foreground">sessions</span>
        </div>
      </CardContent>
      <CardFooter className="grid grid-cols-2 items-start gap-4 border-t py-3 [.border-t]:pt-3">
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CircleCheck
              className={ClassNames.combine(
                'size-3.5',
                variant.resultCompletion.numerator > 0 && 'text-success',
              )}
            />
            Result completion
          </span>
          <AnalyticsRatioValue ratio={variant.resultCompletion} tone="positive" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowUpRight className="size-3.5 text-primary" />
            CTA click-through
          </span>
          <AnalyticsRatioValue ratio={variant.ctaClickThrough} tone="positive" />
        </div>
      </CardFooter>
    </Card>
  );
}

function AnalyticsSteps({ variant }: { readonly variant: AnalyticsVariant }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Variant {variant.variant} · steps</CardTitle>
        <CardDescription>
          See how many sessions reached each step and continued to the next one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>
            Open sessions can still continue. Expired dropout is the share of expired viewers who
            did not complete the step. Results are the final step, so only views are counted.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Step</TableHead>
              <TableHead>Reached</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Completion</TableHead>
              <TableHead>Open</TableHead>
              <TableHead>Expired</TableHead>
              <TableHead>Expired dropout</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variant.steps.map((step, index) => (
              <TableRow key={step.stepIdentifier} className="transition-colors duration-150">
                <TableCell>
                  <div className="flex items-start gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs text-primary tabular-nums">
                      {index + 1}
                    </span>
                    <div className="flex flex-col gap-2">
                      <span className="font-medium">{step.stepIdentifier}</span>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary">{step.type}</Badge>
                        {step.conditional && (
                          <Badge variant="outline">
                            <GitBranch data-icon="inline-start" />
                            Conditional
                          </Badge>
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
                    <Badge variant="success">Terminal · reach only</Badge>
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
                            aria-label={`${step.stepIdentifier} completion`}
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
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AnalyticsPaths({ variant }: { readonly variant: AnalyticsVariant }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Variant {variant.variant} · paths</CardTitle>
        <CardDescription>
          Follow sessions between steps. Sessions sent to another branch aren’t counted as missing
          the destination.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>
            Observed conversion: source viewers reaching this destination. Branch share: transitions
            on this edge / source forward transitions. Transition-to-view: destination viewers /
            edge transitions. Branch shares may exceed 100% in total after revisits.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Path</TableHead>
              <TableHead>Transitions</TableHead>
              <TableHead>Observed conversion</TableHead>
              <TableHead>Branch share</TableHead>
              <TableHead>Transition-to-view</TableHead>
              <TableHead>Destination pending</TableHead>
              <TableHead>Destination expired</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variant.edges.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Route className="size-5 text-muted-foreground" />
                    <span className="font-medium">No paths recorded yet</span>
                    <span className="text-xs text-muted-foreground">
                      Paths appear after a session moves forward between steps.
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {variant.edges.map((edge) => (
              <TableRow key={`${edge.fromStepIdentifier}:${edge.toStepIdentifier}`}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{edge.fromStepIdentifier}</span>
                    <span className="text-xs text-muted-foreground">→ {edge.toStepIdentifier}</span>
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">
                  {AnalyticsFormat.count(edge.transitions)}
                </TableCell>
                <TableCell>
                  <AnalyticsRatioValue ratio={edge.observedConversion} />
                </TableCell>
                <TableCell>
                  <AnalyticsRatioValue ratio={edge.branchShare} />
                </TableCell>
                <TableCell>
                  <AnalyticsRatioValue ratio={edge.transitionToView} />
                </TableCell>
                <TableCell
                  data-nonzero={edge.destinationNonreach.open > 0}
                  className="tabular-nums data-[nonzero=true]:text-warning"
                >
                  {AnalyticsFormat.count(edge.destinationNonreach.open)}
                </TableCell>
                <TableCell
                  data-nonzero={edge.destinationNonreach.expired > 0}
                  className="font-medium tabular-nums data-[nonzero=true]:text-destructive"
                >
                  {AnalyticsFormat.count(edge.destinationNonreach.expired)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function AnalyticsVersionPanel({
  version,
  onOpenFilters,
}: {
  readonly version: AnalyticsVersion;
  readonly onOpenFilters?: () => void;
}) {
  const hasObservations = version.variants.some((variant) => variant.started > 0);
  const startedSessions = version.variants.reduce((total, variant) => total + variant.started, 0);

  return (
    <section
      className="@container/analytics-version flex min-w-0 flex-col gap-5"
      aria-label={`Version ${version.funnelVersion} analytics`}
    >
      <AnalyticsMarketingOverview version={version} />
      <div className="analytics-bento grid min-w-0 gap-5 @min-[60rem]/analytics-version:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="grid min-w-0 gap-5 @min-[38rem]/analytics-version:grid-cols-2 @min-[60rem]/analytics-version:grid-cols-1">
          {version.variants.map((variant) => (
            <AnalyticsVariantSummary key={variant.variant} variant={variant} />
          ))}
        </div>
        <div className="grid min-w-0 gap-5">
          <Card className="analytics-chart min-w-0 gap-4 py-5">
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-2">
                <CardTitle>Conversion by variant</CardTitle>
                <CardDescription>
                  Result views and recommendation opens per started session.
                </CardDescription>
              </div>
              <Badge variant="outline">Version {version.funnelVersion}</Badge>
            </CardHeader>
            <CardContent>
              {hasObservations ? (
                <DeferredView loading={<SkeletonChart embedded />}>
                  <AnalyticsComparisonChart variants={version.variants} />
                </DeferredView>
              ) : (
                <Empty className="min-h-56">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <GitBranch />
                    </EmptyMedia>
                    <EmptyTitle>No sessions yet</EmptyTitle>
                    <EmptyDescription>
                      No sessions match these filters. Try another filter or check back after the
                      funnel receives traffic.
                    </EmptyDescription>
                  </EmptyHeader>
                  {onOpenFilters && (
                    <Button variant="outline" onClick={onOpenFilters}>
                      Adjust filters
                    </Button>
                  )}
                </Empty>
              )}
            </CardContent>
          </Card>
          <Card className="analytics-context gap-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FlaskConical className="size-4 text-primary" />
                <CardTitle>Session split</CardTitle>
              </div>
              <CardDescription className="break-words">
                {version.experimentIdentifier}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 @min-[38rem]/analytics-version:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-sm text-muted-foreground">Started sessions</span>
                <span className="text-4xl font-semibold tracking-tight tabular-nums">
                  {AnalyticsFormat.count(startedSessions)}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {version.variants.map((variant) => (
                  <div key={variant.variant} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Variant {variant.variant}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {AnalyticsFormat.count(variant.started)} sessions
                      </span>
                    </div>
                    <Progress
                      className="h-1.5"
                      value={startedSessions > 0 ? (variant.started / startedSessions) * 100 : 0}
                      aria-label={`Variant ${variant.variant} share of started sessions`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 border-t pt-4 text-xs leading-relaxed text-muted-foreground @min-[38rem]/analytics-version:col-span-2">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  Both chart rates use started sessions. CTA click-through uses only sessions that
                  viewed a result.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Tabs defaultValue={version.variants[0]?.variant ?? ''} className="min-w-0 gap-4 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold">Step-by-step results</h3>
            <p className="text-xs text-muted-foreground">
              Choose a variant to review its steps and paths.
            </p>
          </div>
          <TabsList aria-label={`Version ${version.funnelVersion} variants`}>
            {version.variants.map((variant) => (
              <TabsTrigger key={variant.variant} value={variant.variant}>
                Variant {variant.variant}
                <span className="ml-1 rounded bg-background/60 px-1.5 text-xs tabular-nums">
                  {variant.steps.length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {version.variants.map((variant) => (
          <TabsContent key={variant.variant} value={variant.variant}>
            <Tabs defaultValue="steps" className="min-w-0 gap-4">
              <TabsList aria-label={`Variant ${variant.variant} detail views`}>
                <TabsTrigger value="steps">
                  <ListOrdered className="size-4" />
                  Steps
                </TabsTrigger>
                <TabsTrigger value="paths">
                  <Route className="size-4" />
                  Paths
                </TabsTrigger>
              </TabsList>
              <TabsContent value="steps" className="flex min-w-0 flex-col gap-4">
                <AnalyticsStepOverview variant={variant} />
                <AnalyticsSteps variant={variant} />
                <Alert>
                  <AlertDescription>
                    Sessions can go back or switch branches, so counts may rise between steps. Only
                    events received by the server are included.
                  </AlertDescription>
                </Alert>
              </TabsContent>
              <TabsContent value="paths">
                <AnalyticsPaths variant={variant} />
              </TabsContent>
            </Tabs>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
