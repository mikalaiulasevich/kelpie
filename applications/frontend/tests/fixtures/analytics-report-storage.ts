export const AnalyticsReportStorageFixture = {
  create() {
    const values = new Map<string, string>();

    return {
      getItem(key: string): string | null {
        return values.get(key) ?? null;
      },

      setItem(key: string, value: string): void {
        values.set(key, value);
      },
    };
  },
} as const;
