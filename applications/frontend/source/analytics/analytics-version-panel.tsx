import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ArrowUpRight, GitBranch, Layers } from 'lucide-react';
import { isNull } from 'es-toolkit/predicate';
import { Alert, AlertDescription } from '../components/alert';
import { Badge } from '../components/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../components/chart';
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

const comparisonChart = {
  results: { label: 'Result completion', color: 'var(--chart-2)' },
  recommendations: { label: 'CTA conversion', color: 'var(--primary)' },
} satisfies ChartConfig;

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
        <CardDescription>Unique sessions in this cohort</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">CTA conversion · primary</span>
            <span className="text-3xl font-semibold tracking-tight tabular-nums">
              {AnalyticsFormat.ratio(variant.ctaConversion)}
            </span>
            <span className="text-xs text-muted-foreground">
              {AnalyticsFormat.fraction(variant.ctaConversion)}
            </span>
          </div>
          <ArrowUpRight className="size-6 text-primary" aria-hidden="true" />
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
  const comparisonData = version.variants.map((variant) => ({
    variant: `Variant ${variant.variant}`,
    results: isNull(variant.resultCompletion.value) ? null : variant.resultCompletion.value * 100,
    recommendations: isNull(variant.ctaConversion.value) ? null : variant.ctaConversion.value * 100,
  }));

  return (
    <section
      className="flex min-w-0 flex-col gap-5"
      aria-label={`Version ${version.funnelVersion} analytics`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Layers className="size-5 text-muted-foreground" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold tracking-tight">
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
          <div className="grid gap-4 xl:grid-cols-2">
            {version.variants.map((variant) => (
              <AnalyticsVariantSummary key={variant.variant} variant={variant} />
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>From first visit to recommendations</CardTitle>
              <CardDescription>
                Compare result completion and CTA conversion within this version and experiment.
                Percentages use started sessions as their denominator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasObservations ? (
                <>
                  <ChartContainer config={comparisonChart} className="h-64 w-full">
                    <BarChart
                      accessibilityLayer
                      data={comparisonData}
                      margin={{ left: 0, right: 12, bottom: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="variant" tickLine={false} axisLine={false} tickMargin={12} />
                      <YAxis tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name) => (
                              <div className="flex w-full items-center justify-between gap-4">
                                <span className="text-muted-foreground">
                                  {name === 'results' ? 'Result completion' : 'CTA conversion'}
                                </span>
                                <span className="font-medium tabular-nums">
                                  {typeof value === 'number' ? `${value.toFixed(1)}%` : value}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Bar dataKey="results" fill="var(--color-results)" radius={4} />
                      <Bar
                        dataKey="recommendations"
                        fill="var(--color-recommendations)"
                        radius={4}
                      />
                    </BarChart>
                  </ChartContainer>
                  <div className="mt-4 flex flex-wrap justify-center gap-5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-chart-2" />
                      Result completion
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-primary" />
                      CTA conversion
                    </span>
                  </div>
                </>
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <GitBranch />
                    </EmptyMedia>
                    <EmptyTitle>Waiting for session observations</EmptyTitle>
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
