import { DeferredView } from '../application/deferred-view';
import { lazy } from 'react';
import { Skeleton } from '../components/skeleton';
import { GitBranch } from 'lucide-react';
import { Alert, AlertDescription } from '../components/alert';
import { Badge } from '../components/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Variant {variant.variant}</CardTitle>
          <Badge variant="outline">{AnalyticsFormat.count(variant.started)} started</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">CTA conversion · primary</span>
            <span className="text-2xl font-semibold tracking-tight tabular-nums">
              {AnalyticsFormat.ratio(variant.ctaConversion)}
            </span>
            <span className="text-xs text-muted-foreground">
              {AnalyticsFormat.fraction(variant.ctaConversion)}
            </span>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <dt className="text-sm text-muted-foreground">Result completion</dt>
            <dd>
              <AnalyticsRatioValue ratio={variant.resultCompletion} />
            </dd>
          </div>
          <div className="flex flex-col gap-2">
            <dt className="text-sm text-muted-foreground">CTA click-through</dt>
            <dd>
              <AnalyticsRatioValue ratio={variant.ctaClickThrough} />
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
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
      className="flex min-w-0 flex-col gap-5"
      aria-label={`Version ${version.funnelVersion} analytics`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold tracking-tight">
              Version {version.funnelVersion}
            </h2>
            <p className="text-xs text-muted-foreground break-all">
              Experiment {version.experimentIdentifier}
            </p>
          </div>
        </div>
        <Badge variant="outline">
          {version.variants.length} {version.variants.length === 1 ? 'variant' : 'variants'}
        </Badge>
      </div>
      <Tabs defaultValue="summary" className="min-w-0 gap-5">
        <TabsList aria-label={`Version ${version.funnelVersion} detail views`}>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="paths">Paths</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-2">
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
                    <Skeleton aria-label="Loading comparison chart" className="h-64 w-full" />
                  }
                >
                  <AnalyticsComparisonChart variants={version.variants} />
                </DeferredView>
              ) : (
                <Empty>
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
