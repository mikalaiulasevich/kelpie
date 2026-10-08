import { AnalyticsReportFixture } from '../fixtures/analytics-report-fixture.js';

export const AnalyticsReportCases = {
  InvalidEnvelopes: [
    { name: 'missing report row', rows: [] },
    { name: 'extra report row', rows: [{ report: '{}' }, { report: '{}' }] },
    { name: 'non-text report', rows: [{ report: null }] },
    { name: 'malformed JSON', rows: [{ report: '{' }] },
    { name: 'missing projection', rows: [{ report: '{}' }] },
    {
      name: 'invalid count',
      rows: [
        {
          report: JSON.stringify({
            ...AnalyticsReportFixture.empty(),
            summaries: [
              {
                versionIdentifier: 'version-one',
                variant: 'A',
                started: -1,
                results: 0,
                clicks: 0,
                resultClicks: 0,
              },
            ],
          }),
        },
      ],
    },
    {
      name: 'unsafe integer count',
      rows: [
        {
          report: JSON.stringify({
            ...AnalyticsReportFixture.empty(),
            summaries: [
              {
                versionIdentifier: 'version-one',
                variant: 'A',
                started: 9007199254740992,
                results: 0,
                clicks: 0,
                resultClicks: 0,
              },
            ],
          }),
        },
      ],
    },
    {
      name: 'unexpected projection',
      rows: [{ report: JSON.stringify({ ...AnalyticsReportFixture.empty(), rawAnswers: [] }) }],
    },
  ],
} as const;
