import { AnalyticsRatioValue } from './analytics-ratio-value';
import { AnalyticsStepTable } from './analytics-step-table';
import { AnalyticsPathTable } from './analytics-path-table';
import { AnalyticsContent } from './analytics-content';
import { useLocalization } from '../localization/use-localization';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/tabs';
import type { AnalyticsVariant, AnalyticsVersion } from '../management/management-types';
import { AnalyticsFormat } from './analytics-format';
import { ClassNames } from '../styling/combine-class-names';

const AnalyticsComparisonChart = lazy(() =>
  import('./analytics-comparison-chart').then((module) => ({
    default: module.AnalyticsComparisonChart,
  })),
);

interface AnalyticsVariantSummaryProperties {
  readonly variant: AnalyticsVariant;
}

function AnalyticsVariantSummary({ variant }: AnalyticsVariantSummaryProperties) {
  const { t: translate } = useLocalization();

  return (
    <Card className="analytics-metric gap-4 overflow-hidden py-0" data-variant={variant.variant}>
      <CardHeader className="flex flex-row items-center gap-3 pt-4">
        <div className="flex items-center gap-3">
          <span
            className={ClassNames.combine(
              'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
              variant.variant === 'A' ? 'bg-primary/12 text-primary' : 'bg-info/12 text-info',
            )}
          >
            {variant.variant}
          </span>
          <div className="flex flex-col gap-1">
            <CardTitle>
              {translate(AnalyticsContent.Variant)} {variant.variant}
            </CardTitle>
            <CardDescription className="text-xs">
              {variant.steps.length} {translate(AnalyticsContent.StepsSeparator)}{' '}
              {variant.edges.length} {translate(AnalyticsContent.TransitionsUnit)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <MousePointer2 className="size-3.5" />
            {translate(AnalyticsContent.PrimaryConversion)}
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
              aria-label={translate(AnalyticsContent.VariantConversionLabel, {
                variant: variant.variant,
              })}
            />
          )}
        </div>
        <div className="flex flex-col items-end gap-2 border-l pl-5">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            {translate(AnalyticsContent.Started)}
          </span>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {AnalyticsFormat.count(variant.started)}
          </p>
          <span className="text-xs text-muted-foreground">
            {translate(AnalyticsContent.SessionsUnit)}
          </span>
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
            {translate(AnalyticsContent.ResultCompletion)}
          </span>
          <AnalyticsRatioValue ratio={variant.resultCompletion} tone="positive" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowUpRight className="size-3.5 text-primary" />
            {translate(AnalyticsContent.CallToActionClickThrough)}
          </span>
          <AnalyticsRatioValue ratio={variant.ctaClickThrough} tone="positive" />
        </div>
      </CardFooter>
    </Card>
  );
}

interface AnalyticsVersionPanelProperties {
  readonly version: AnalyticsVersion;
  readonly onOpenFilters?: () => void;
}

export function AnalyticsVersionPanel({ version, onOpenFilters }: AnalyticsVersionPanelProperties) {
  const { t: translate } = useLocalization();

  const hasObservations = version.variants.some((variant) => variant.started > 0);
  const startedSessions = version.variants.reduce((total, variant) => total + variant.started, 0);

  return (
    <section
      className="@container/analytics-version flex min-w-0 flex-col gap-5"
      aria-label={translate(AnalyticsContent.VersionAnalyticsLabel, {
        version: version.funnelVersion,
      })}
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
                <CardTitle>{translate(AnalyticsContent.ConversionByVariant)}</CardTitle>
                <CardDescription>
                  {translate(AnalyticsContent.ConversionDescription)}
                </CardDescription>
              </div>
              <Badge variant="outline">
                {translate(AnalyticsContent.Version)} {version.funnelVersion}
              </Badge>
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
                    <EmptyTitle>{translate(AnalyticsContent.EmptySessions)}</EmptyTitle>
                    <EmptyDescription>
                      {translate(AnalyticsContent.EmptySessionsDescription)}
                    </EmptyDescription>
                  </EmptyHeader>
                  {onOpenFilters && (
                    <Button variant="outline" onClick={onOpenFilters}>
                      {translate(AnalyticsContent.AdjustFilters)}
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
                <CardTitle>{translate(AnalyticsContent.SessionSplit)}</CardTitle>
              </div>
              <CardDescription className="break-words">
                {version.experimentIdentifier}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 @min-[38rem]/analytics-version:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-sm text-muted-foreground">
                  {translate(AnalyticsContent.StartedSessions)}
                </span>
                <span className="text-4xl font-semibold tracking-tight tabular-nums">
                  {AnalyticsFormat.count(startedSessions)}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {version.variants.map((variant) => (
                  <div key={variant.variant} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>
                        {translate(AnalyticsContent.Variant)} {variant.variant}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {AnalyticsFormat.count(variant.started)}{' '}
                        {translate(AnalyticsContent.SessionsUnit)}
                      </span>
                    </div>
                    <Progress
                      className="h-1.5"
                      value={startedSessions > 0 ? (variant.started / startedSessions) * 100 : 0}
                      aria-label={translate(AnalyticsContent.VariantStartsLabel, {
                        variant: variant.variant,
                      })}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 border-t pt-4 text-xs leading-relaxed text-muted-foreground @min-[38rem]/analytics-version:col-span-2">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <p>{translate(AnalyticsContent.RateDenominatorDescription)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Tabs
        defaultValue={version.variants[0]?.variant ?? ''}
        className="analytics-detail-tabs min-w-0 gap-4 pt-3"
      >
        <div className="analytics-detail-heading">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold">{translate(AnalyticsContent.StepResults)}</h3>
            <p className="text-xs text-muted-foreground">
              {translate(AnalyticsContent.StepResultsDescription)}
            </p>
          </div>
        </div>
        <TabsList
          className="analytics-variant-tabs"
          aria-label={translate(AnalyticsContent.VersionVariantsLabel, {
            version: version.funnelVersion,
          })}
        >
          {version.variants.map((variant) => (
            <TabsTrigger key={variant.variant} value={variant.variant}>
              {translate(AnalyticsContent.Variant)} {variant.variant}
              <span className="ml-1 rounded bg-background/60 px-1.5 text-xs tabular-nums">
                {variant.steps.length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        {version.variants.map((variant) => (
          <TabsContent
            className="analytics-detail-panel"
            key={variant.variant}
            value={variant.variant}
          >
            <Tabs defaultValue="steps" className="min-w-0 gap-4">
              <TabsList
                aria-label={translate(AnalyticsContent.VariantDetailsLabel, {
                  variant: variant.variant,
                })}
              >
                <TabsTrigger value="steps">
                  <ListOrdered className="size-4" />
                  {translate(AnalyticsContent.Steps)}
                </TabsTrigger>
                <TabsTrigger value="paths">
                  <Route className="size-4" />
                  {translate(AnalyticsContent.Paths)}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="steps" className="flex min-w-0 flex-col gap-4">
                <AnalyticsStepOverview variant={variant} />
                <AnalyticsStepTable variant={variant} />
                <Alert>
                  <AlertDescription>
                    {translate(AnalyticsContent.RevisitDescription)}
                  </AlertDescription>
                </Alert>
              </TabsContent>
              <TabsContent value="paths">
                <AnalyticsPathTable variant={variant} />
              </TabsContent>
            </Tabs>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
