import { describe, expect, it } from 'vitest';
import { DatabaseReadService } from '../../source/database/database-read.service.js';
import { AdministrationFixture } from '../fixtures/administration.js';
import { AnalyticsFixture } from '../fixtures/analytics-fixture.js';
import { AnalyticsReadIsolationFixture } from '../fixtures/analytics-read-isolation-fixture.js';

describe('analytics snapshot isolation from administration requests', () => {
  it('serves authenticated configuration and publication reads while a report holds its snapshot', async () => {
    const backend = await AdministrationFixture.create();

    try {
      await AnalyticsFixture.prepare(backend);
      const cookie = AdministrationFixture.cookie(await AdministrationFixture.signIn(backend));
      const held = AnalyticsReadIsolationFixture.holdNextReport(
        backend.getService(DatabaseReadService),
      );
      const report = backend.request(
        '/api/administration/analytics?funnelIdentifier=workstyle-planner',
        { headers: { cookie } },
      );

      try {
        await held.waitUntilHeld(report);
        const responses = await Promise.all([
          backend.request('/api/administration/configurations?funnelIdentifier=workstyle-planner', {
            headers: { cookie },
            signal: AbortSignal.timeout(
              AnalyticsReadIsolationFixture.OperationalRequestDeadlineMilliseconds,
            ),
          }),
          backend.request('/api/administration/publications?funnelIdentifier=workstyle-planner', {
            headers: { cookie },
            signal: AbortSignal.timeout(
              AnalyticsReadIsolationFixture.OperationalRequestDeadlineMilliseconds,
            ),
          }),
        ]);

        expect(responses.map((response) => response.status)).toEqual([200, 200]);
        held.release();
        const response = await report;

        expect(response.status).toBe(200);
        expect((await AnalyticsFixture.response(response)).versions).toHaveLength(2);
      } finally {
        held.release();
        await Promise.allSettled([report]);
        held.restore();
      }
    } finally {
      await backend.close();
    }
  });
});
