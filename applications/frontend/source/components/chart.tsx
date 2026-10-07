import { isNil, isString, isUndefined } from 'es-toolkit';
import { ChartMessages } from './chart-messages';
import { ChartPayload } from './chart-payload';

import * as React from 'react';
import { ClassNames } from '../styling/combine-class-names';
import * as RechartsPrimitive from 'recharts';
import type { TooltipValueType } from 'recharts';
import type { ChartConfiguration, ChartContextProperties } from './chart-types';
import { ChartStyleRules } from './chart-style-rules';

import { ChartPolicy } from './chart-policy';

interface ChartIndicatorStyle extends React.CSSProperties {
  '--color-bg'?: Optional<string>;
  '--color-border'?: Optional<string>;
}

const ChartContext = React.createContext<ChartContextProperties | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error(ChartMessages.ContainerRequired);
  }

  return context;
}

function ChartContainer({
  id: identifier,
  className,
  children,
  config: configuration,
  initialDimension = ChartPolicy.InitialDimension,
  ...properties
}: React.ComponentProps<'div'> & {
  config: ChartConfiguration;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
  initialDimension?: {
    width: number;
    height: number;
  };
}) {
  const uniqueIdentifier = React.useId();
  const chartIdentifier = `chart-${identifier ?? uniqueIdentifier.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ configuration }}>
      <div
        data-slot="chart"
        data-chart={chartIdentifier}
        className={ClassNames.combine(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...properties}
      >
        <ChartStyle id={chartIdentifier} config={configuration} />
        <RechartsPrimitive.ResponsiveContainer initialDimension={initialDimension}>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

interface ChartStyleProperties {
  readonly id: string;
  readonly config: ChartConfiguration;
}

function ChartStyle({ id: identifier, config: configuration }: ChartStyleProperties) {
  const rules = ChartStyleRules.create(identifier, configuration);

  return rules ? <style dangerouslySetInnerHTML={{ __html: rules }} /> : null;
}

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<'div'> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: 'line' | 'dot' | 'dashed';
    nameKey?: string;
    labelKey?: string;
  } & Omit<
    RechartsPrimitive.DefaultTooltipContentProps<TooltipValueType, TextOrNumber>,
    'accessibilityLayer'
  >) {
  const { configuration } = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null;
    }

    const [item] = payload;
    const key = `${labelKey ?? item?.dataKey ?? item?.name ?? 'value'}`;
    const itemConfiguration = ChartPayload.configuration(configuration, item, key);
    const value =
      !labelKey && isString(label)
        ? (configuration[label]?.label ?? label)
        : itemConfiguration?.label;

    if (labelFormatter) {
      return (
        <div className={ClassNames.combine('font-medium', labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      );
    }

    if (!value) {
      return null;
    }

    return <div className={ClassNames.combine('font-medium', labelClassName)}>{value}</div>;
  }, [label, labelFormatter, payload, hideLabel, labelClassName, configuration, labelKey]);

  if (!active || !payload?.length) {
    return null;
  }

  const nestLabel = payload.length === 1 && indicator !== 'dot';

  return (
    <div
      className={ClassNames.combine(
        'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload
          .filter((item) => item.type !== 'none')
          .map((item, index) => {
            const key = `${nameKey ?? item.name ?? item.dataKey ?? 'value'}`;
            const itemConfiguration = ChartPayload.configuration(configuration, item, key);
            const indicatorColor = color ?? ChartPayload.fill(item.payload) ?? item.color;
            const indicatorStyle: ChartIndicatorStyle = {
              '--color-bg': indicatorColor,
              '--color-border': indicatorColor,
            };

            return (
              <div
                key={index}
                className={ClassNames.combine(
                  'flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground',
                  indicator === 'dot' && 'items-center',
                )}
              >
                {formatter && !isUndefined(item?.value) && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfiguration?.icon ? (
                      <itemConfiguration.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={ClassNames.combine(
                            'shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)',
                            {
                              'h-2.5 w-2.5': indicator === 'dot',
                              'w-1': indicator === 'line',
                              'w-0 border-[1.5px] border-dashed bg-transparent':
                                indicator === 'dashed',
                              'my-0.5': nestLabel && indicator === 'dashed',
                            },
                          )}
                          style={indicatorStyle}
                        />
                      )
                    )}
                    <div
                      className={ClassNames.combine(
                        'flex flex-1 justify-between leading-none',
                        nestLabel ? 'items-end' : 'items-center',
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">
                          {itemConfiguration?.label ?? item.name}
                        </span>
                      </div>
                      {!isNil(item.value) && (
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {typeof item.value === 'number'
                            ? item.value.toLocaleString()
                            : String(item.value)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = 'bottom',
  nameKey,
}: React.ComponentProps<'div'> & {
  hideIcon?: boolean;
  nameKey?: string;
} & RechartsPrimitive.DefaultLegendContentProps) {
  const { configuration } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      className={ClassNames.combine(
        'flex items-center justify-center gap-4',
        verticalAlign === 'top' ? 'pb-3' : 'pt-3',
        className,
      )}
    >
      {payload
        .filter((item) => item.type !== 'none')
        .map((item, index) => {
          const key = `${nameKey ?? item.dataKey ?? 'value'}`;
          const itemConfiguration = ChartPayload.configuration(configuration, item, key);

          return (
            <div
              key={index}
              className={ClassNames.combine(
                'flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground',
              )}
            >
              {itemConfiguration?.icon && !hideIcon ? (
                <itemConfiguration.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfiguration?.label}
            </div>
          );
        })}
    </div>
  );
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};
