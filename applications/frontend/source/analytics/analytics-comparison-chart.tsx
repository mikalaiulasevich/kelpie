import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { isNull } from 'es-toolkit/predicate';
import type { AnalyticsVariant } from '../management/management-types';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../components/chart';
const comparisonChart = {
  results: { label: 'Result completion', color: 'var(--chart-2)' },
  recommendations: { label: 'CTA conversion', color: 'var(--primary)' },
} satisfies ChartConfig;

export function AnalyticsComparisonChart({
  variants,
}: {
  readonly variants: readonly AnalyticsVariant[];
}) {
  const comparisonData = variants.map((variant) => ({
    variant: `Variant ${variant.variant}`,
    results: isNull(variant.resultCompletion.value) ? null : variant.resultCompletion.value * 100,
    recommendations: isNull(variant.ctaConversion.value) ? null : variant.ctaConversion.value * 100,
  }));

  return (
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
          <Bar dataKey="recommendations" fill="var(--color-recommendations)" radius={4} />
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
  );
}
