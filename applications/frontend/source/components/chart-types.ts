import type * as React from 'react';
import type { ChartPolicy } from './chart-policy';

export type ChartConfiguration = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<(typeof ChartPolicy.Themes)[number], string> }
  )
>;

export type ChartContextProperties = {
  configuration: ChartConfiguration;
};
