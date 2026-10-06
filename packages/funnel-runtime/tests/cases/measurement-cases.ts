export const MeasurementCases = {
  summaries: [
    {
      description: 'unsorted odd sample count',
      samples: [9, 1, 5],
      median: 5,
      minimum: 1,
      maximum: 9,
    },
    { description: 'even sample count', samples: [8, 2, 4, 6], median: 5, minimum: 2, maximum: 8 },
    { description: 'single zero sample', samples: [0], median: 0, minimum: 0, maximum: 0 },
  ],
} as const;
