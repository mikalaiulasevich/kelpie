export const SessionTimestamps = {
  isCanonical(value: string): boolean {
    const date = new Date(value);

    return Number.isFinite(date.getTime()) && date.toISOString() === value;
  },
} as const;
