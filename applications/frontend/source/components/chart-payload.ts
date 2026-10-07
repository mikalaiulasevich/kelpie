import { isNull, isString } from 'es-toolkit';
import type { ChartConfiguration } from './chart-types';

export const ChartPayload = {
  property(payload: unknown, key: string): unknown {
    if (typeof payload !== 'object' || isNull(payload) || !Object.hasOwn(payload, key)) {
      return undefined;
    }

    return Reflect.get(payload, key);
  },

  configuration(configuration: ChartConfiguration, payload: unknown, key: string) {
    const directKey = ChartPayload.property(payload, key);
    const nestedKey = ChartPayload.property(ChartPayload.property(payload, 'payload'), key);

    if (isString(directKey)) {
      return configuration[directKey] ?? configuration[key];
    }

    if (isString(nestedKey)) {
      return configuration[nestedKey] ?? configuration[key];
    }

    return configuration[key];
  },

  fill(payload: unknown): Optional<string> {
    const fill = ChartPayload.property(payload, 'fill');

    return isString(fill) ? fill : undefined;
  },
} as const;
