import { DeferredView } from '../application/deferred-view';
import { lazy } from 'react';
import { isNull } from 'es-toolkit/predicate';
import { Skeleton } from '../components/skeleton';
import { GitBranch } from 'lucide-react';
import { Alert, AlertDescription } from '../components/alert';
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

const AnalyticsComparisonChart = lazy(() =>
  import('./analytics-comparison-chart').then((module) => ({
    default: module.AnalyticsComparisonChart,
  })),
);

function AnalyticsRatioValue({ ratio }: { readonly ratio: AnalyticsRatio }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium tabular-nums">{AnalyticsFormat.ratio(ratio)}</span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {AnalyticsFormat.fraction(ratio)}
      </span>
    </div>
  );
}

function AnalyticsVariantSummary({ variant }: { readonly variant: AnalyticsVariant }) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardDescription>Variant {variant.variant}</CardDescription>
          <CardTitle>Started sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-semibold tracking-tight tabular-nums">
            {AnalyticsFormat.count(variant.started)}
          </p>
        </CardContent>
        <CardFooter className="mt-auto flex-col items-start gap-2">
          <span className="text-sm text-muted-foreground">Result completion</span>
          <AnalyticsRatioValue ratio={variant.resultCompletion} />
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Variant {variant.variant}</CardDescription>
          <CardTitle>CTA conversion · primary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p
            data-applicable={!isNull(variant.ctaConversion.value)}
            className="text-4xl font-semibold tracking-tight tabular-nums data-[applicable=false]:text-xl"
          >
            {AnalyticsFormat.ratio(variant.ctaConversion)}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {AnalyticsFormat.fraction(variant.ctaConversion)}
          </p>
        </CardContent>
        <CardFooter className="mt-auto flex-col items-start gap-2">
          <span className="text-sm text-muted-foreground">CTA click-through</span>
          <AnalyticsRatioValue ratio={variant.ctaClickThrough} />
        </CardFooter>
      </Card>
    </>
  );
}

function AnalyticsSteps({ variant }: { readonly variant: AnalyticsVariant }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Variant {variant.variant} · ordered steps</CardTitle>
        <CardDescription>
          Reached sessions come from accepted views. A forward transition completes information and
          interactive steps.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>
            Open noncompletion is pending. Expired dropout uses expired viewers as its denominator.
            Result steps are terminal and report reach only.
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
              <TableRow key={step.stepIdentifier}>
                <TableCell>
                  <div className="flex items-start gap-3">
                    <span className="text-muted-foreground tabular-nums">{index + 1}</span>
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
                    <Badge variant="outline">Terminal · reach only</Badge>
                  </TableCell>
                ) : (
                  <>
                    <TableCell className="tabular-nums">
                      {AnalyticsFormat.count(step.completed)}
                    </TableCell>
                    <TableCell>
                      <AnalyticsRatioValue ratio={step.completion} />
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {AnalyticsFormat.count(step.noncompletion.open)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {AnalyticsFormat.count(step.noncompletion.expired)}
                    </TableCell>
                    <TableCell>
                      <AnalyticsRatioValue ratio={step.expiredDropout} />
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
        <CardTitle>Variant {variant.variant} · committed paths</CardTitle>
        <CardDescription>
          Historical session reach across each directed edge. Sessions routed to another branch are
          excluded from destination nonreach.
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
                <TableCell className="tabular-nums">
                  {AnalyticsFormat.count(edge.destinationNonreach.open)}
                </TableCell>
                <TableCell className="tabular-nums">
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

export function AnalyticsVersionPanel({ version }: { readonly version: AnalyticsVersion }) {
  const hasObservations = version.variants.some((variant) => variant.started > 0);

  return (
    <section
      className="@container/analytics-version flex min-w-0 flex-col gap-6"
      aria-label={`Version ${version.funnelVersion} analytics`}
    >
      <Tabs defaultValue="summary" className="min-w-0 gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold tracking-tight">
                Version {version.funnelVersion}
              </h2>
              <Badge variant="outline">
                {version.variants.length} {version.variants.length === 1 ? 'variant' : 'variants'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground break-all">
              Experiment {version.experimentIdentifier}
            </p>
          </div>
          <TabsList aria-label={`Version ${version.funnelVersion} detail views`}>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="paths">Paths</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="summary" className="flex flex-col gap-6">
          <div className="grid gap-6 @min-[34rem]/analytics-version:grid-cols-2 @min-[58rem]/analytics-version:grid-cols-4">
            {version.variants.map((variant) => (
              <AnalyticsVariantSummary key={variant.variant} variant={variant} />
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Conversion rates</CardTitle>
              <CardDescription>
                Result completion and CTA conversion use started sessions as their denominator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasObservations ? (
                <DeferredView
                  loading={
                    <Skeleton
                      aria-label="Loading comparison chart"
                      className="h-80 w-full sm:h-96"
                    />
                  }
                >
                  <AnalyticsComparisonChart variants={version.variants} />
                </DeferredView>
              ) : (
                <Empty className="min-h-80 sm:min-h-96">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <GitBranch />
                    </EmptyMedia>
                    <EmptyTitle>No sessions yet</EmptyTitle>
                    <EmptyDescription>
                      This cohort has no started sessions. Ratios remain not applicable until a
                      denominator exists.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="steps" className="flex min-w-0 flex-col gap-4">
          {version.variants.map((variant) => (
            <AnalyticsSteps key={variant.variant} variant={variant} />
          ))}
          <Alert>
            <AlertDescription>
              Historical views persist when a visitor goes Back or changes branches. These counts
              need not form a single monotone funnel. Unsent events remain unobservable.
            </AlertDescription>
          </Alert>
        </TabsContent>
        <TabsContent value="paths" className="flex min-w-0 flex-col gap-4">
          {version.variants.map((variant) => (
            <AnalyticsPaths key={variant.variant} variant={variant} />
          ))}
        </TabsContent>
      </Tabs>
    </section>
  );
}
