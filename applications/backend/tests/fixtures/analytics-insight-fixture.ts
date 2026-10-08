import type { BackendApplicationFixture } from './backend-application.js';
import { AnalyticsFixture } from './analytics-fixture.js';

export const AnalyticsInsightFixture = {
  async prepare(backend: BackendApplicationFixture) {
    const versions = await AnalyticsFixture.prepare(backend);
    await backend.database.session.updateMany({
      data: { createdAt: new Date('2026-01-01T12:00:00Z') },
    });
    await backend.database.event.updateMany({
      data: { serverTimestamp: new Date('2026-01-01T12:05:00Z') },
    });
    await backend.database.sessionTransition.updateMany({
      data: { createdAt: new Date('2026-01-01T12:06:00Z') },
    });
    await backend.database.session.update({
      where: { identifier: 'pending' },
      data: { createdAt: new Date('2026-01-02T00:00:00Z') },
    });
    await backend.database.event.updateMany({
      where: { sessionIdentifier: 'complete', name: 'cta_clicked' },
      data: { serverTimestamp: new Date('2026-01-01T14:00:00Z') },
    });
    await backend.database.event.updateMany({
      where: { name: 'result_viewed' },
      data: { properties: { result_id: 'office_core', raw_answer: 'must never reach timeline' } },
    });
    const administrator = await backend.database.administrator.findFirstOrThrow();
    await backend.database.businessOutcome.createMany({
      data: [
        {
          externalIdentifier: 'lead-one',
          source: 'fixture',
          sessionIdentifier: 'complete',
          kind: 'lead',
          occurredAt: new Date('2026-01-01T12:20:00Z'),
          provenance: 'manual',
          administratorIdentifier: administrator.identifier,
        },
        {
          externalIdentifier: 'lead-two',
          source: 'fixture',
          sessionIdentifier: 'complete',
          kind: 'lead',
          occurredAt: new Date('2026-01-01T12:30:00Z'),
          provenance: 'integration',
          administratorIdentifier: administrator.identifier,
        },
        {
          externalIdentifier: 'late-purchase',
          source: 'fixture',
          sessionIdentifier: 'complete',
          kind: 'purchase',
          occurredAt: new Date('2026-01-01T14:00:00Z'),
          provenance: 'integration',
          administratorIdentifier: administrator.identifier,
        },
      ],
    });
    await backend.database.experimentPlan.create({
      data: {
        versionIdentifier: versions.firstVersionIdentifier,
        hypothesis: 'Test recommendation opening',
        primaryMetric: 'recommendation_open',
        targetSamplePerVariant: 10,
        plannedEndAt: new Date('2026-01-02T00:00:00Z'),
        createdAt: new Date('2026-01-01T00:00:00Z'),
        administratorIdentifier: administrator.identifier,
      },
    });

    return versions;
  },
} as const;
