import type { ChartConfiguration } from '../components/chart-types';
import { AnalyticsContent } from './analytics-content';
import { AnalyticsFormat } from './analytics-format';
import { useLocalization } from '../localization/use-localization';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { isNull } from 'es-toolkit/predicate';
import type { AnalyticsVariant } from '../management/management-types';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '../components/chart';

interface AnalyticsComparisonChartProperties {
  readonly variants: readonly AnalyticsVariant[];
}

export function AnalyticsComparisonChart({ variants }: AnalyticsComparisonChartProperties) {
  const { t: translate } = useLocalization();
  const comparisonChart = {
    results: { label: translate(AnalyticsContent.ResultCompletion), color: 'var(--chart-2)' },
    recommendations: {
      label: translate(AnalyticsContent.CallToActionConversion),
      color: 'var(--chart-1)',
    },
  } satisfies ChartConfiguration;

  const comparisonData = variants.map((variant) => ({
    variant: translate(AnalyticsContent.VariantLabel, { variant: variant.variant }),
    results: isNull(variant.resultCompletion.value) ? null : variant.resultCompletion.value * 100,
    recommendations: isNull(variant.ctaConversion.value) ? null : variant.ctaConversion.value * 100,
  }));

  return (
    <>
      <ChartContainer config={comparisonChart} className="h-52 w-full sm:h-56">
        <BarChart
          accessibilityLayer
          layout="vertical"
          data={comparisonData}
          margin={{ left: 0, right: 12, bottom: 8 }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 5" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            unit="%"
            tickMargin={12}
          />
          <YAxis
            type="category"
            dataKey="variant"
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            width={84}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      {translate(
                        name === 'results'
                          ? AnalyticsContent.ResultCompletion
                          : AnalyticsContent.CallToActionConversion,
                      )}
                    </span>
                    <span className="font-medium tabular-nums">
                      {typeof value === 'number' ? AnalyticsFormat.percentage(value / 100) : value}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Bar
            isAnimationActive={false}
            dataKey="results"
            fill="var(--color-results)"
            radius={[0, 4, 4, 0]}
            maxBarSize={32}
          />
          <Bar
            isAnimationActive={false}
            dataKey="recommendations"
            fill="var(--color-recommendations)"
            radius={[0, 4, 4, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ChartContainer>
      <div className="mt-4 flex flex-wrap justify-center gap-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-chart-2" />
          {translate(AnalyticsContent.ResultCompletion)}
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-chart-1" />
          {translate(AnalyticsContent.CallToActionConversion)}
        </span>
      </div>
    </>
  );
}
