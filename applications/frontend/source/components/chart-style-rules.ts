import { ChartPolicy } from './chart-policy';
import type { ChartConfiguration } from './chart-types';

export const ChartStyleRules = {
  create(identifier: string, configuration: ChartConfiguration): string {
    const colors = Object.entries(configuration).filter(([, entry]) => entry.theme ?? entry.color);

    if (colors.length === 0) {
      return '';
    }

    return ChartPolicy.Themes.map((theme) => {
      const declarations = colors
        .map(([key, entry]) => {
          const color = entry.theme?.[theme] ?? entry.color;

          return color ? `  --color-${key}: ${color};` : null;
        })
        .join('\n');

      return `
${ChartPolicy.Selectors[theme]} [data-chart=${identifier}] {
${declarations}
}
`;
    }).join('\n');
  },
} as const;
