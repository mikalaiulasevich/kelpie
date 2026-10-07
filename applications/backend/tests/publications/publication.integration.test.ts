import { PublicationCases } from '../cases/publication-cases.js';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { DatabaseRecords } from '../fixtures/database-records.js';
import { PublicationFixtures } from '../fixtures/publication-fixtures.js';

describe('transactional publications with real SQLite', () => {
  let backend: BackendApplicationFixture;
  beforeEach(async () => {
    backend = await BackendApplicationFixture.create();
  });
  afterEach(async () => {
    await backend?.close();
  });

  it('rolls back by activation history and replays immutable responses after later changes', async () => {
    const { administrator, firstVersion, thirdVersion, service } =
      await PublicationFixtures.prepare(backend);
    const pinned = await backend.database.session.create({
      data: DatabaseRecords.sessionData(firstVersion.identifier),
    });
    const initial = PublicationFixtures.request(
      firstVersion.funnelIdentifier,
      firstVersion.identifier,
    );
    const original = await service.publish(initial, administrator.identifier);
    await service.publish(
      PublicationFixtures.request(firstVersion.funnelIdentifier, thirdVersion.identifier, 1),
      administrator.identifier,
    );
    const rollback = {
      operationIdentifier: randomUUID(),
      funnelIdentifier: firstVersion.funnelIdentifier,
      expectedRevision: 2,
    };
    const restored = await service.rollback(rollback, administrator.identifier);
    expect(restored).toMatchObject({
      targetVersionIdentifier: firstVersion.identifier,
      previousVersionIdentifier: thirdVersion.identifier,
      revision: 3,
      action: 'rollback',
    });
    expect(
      await backend.database.session.findUniqueOrThrow({
        where: { identifier: pinned.identifier },
      }),
    ).toEqual(pinned);
    expect(await service.publish(initial, administrator.identifier)).toEqual(original);
    expect(await service.rollback(rollback, administrator.identifier)).toEqual(restored);
    expect(
      await service.history({ funnelIdentifier: firstVersion.funnelIdentifier, limit: '2' }),
    ).toMatchObject({
      funnel: { activeVersionIdentifier: firstVersion.identifier, revision: 3 },
      items: [{ revision: 3 }, { revision: 2 }],
      nextOffset: 2,
    });
    expect(
      await service.history({ funnelIdentifier: firstVersion.funnelIdentifier, offset: '2' }),
    ).toMatchObject({ items: [{ revision: 1 }], nextOffset: null });
  });

  it('deduplicates simultaneous exact retries', async () => {
    const { administrator, firstVersion, service } = await PublicationFixtures.prepare(backend);
    const request = PublicationFixtures.request(
      firstVersion.funnelIdentifier,
      firstVersion.identifier,
    );
    const [original, repeated] = await Promise.all([
      service.publish(request, administrator.identifier),
      service.publish(request, administrator.identifier),
    ]);
    expect(repeated).toEqual(original);
    expect(await backend.database.publication.count()).toBe(1);
  });

  it('rejects changed payload and administrator identity on an existing operation', async () => {
    const { administrator, firstVersion, thirdVersion, service } =
      await PublicationFixtures.prepare(backend);
    const request = PublicationFixtures.request(
      firstVersion.funnelIdentifier,
      firstVersion.identifier,
    );
    await service.publish(request, administrator.identifier);
    await expect(
      service.publish(
        { ...request, targetVersionIdentifier: thirdVersion.identifier },
        administrator.identifier,
      ),
    ).rejects.toMatchObject({ status: 409, code: 'operation_conflict' });
    await expect(service.publish(request, randomUUID())).rejects.toMatchObject({ status: 409 });
    expect(await backend.database.publication.count()).toBe(1);
  });

  it('rejects a concurrent conflicting retry without creating a second publication', async () => {
    const { administrator, firstVersion, thirdVersion, service } =
      await PublicationFixtures.prepare(backend);
    const request = PublicationFixtures.request(
      firstVersion.funnelIdentifier,
      firstVersion.identifier,
    );
    const outcomes = await Promise.allSettled([
      service.publish(request, administrator.identifier),
      service.publish(
        { ...request, targetVersionIdentifier: thirdVersion.identifier },
        administrator.identifier,
      ),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.find((outcome) => outcome.status === 'rejected')).toMatchObject({
      reason: { status: 409, code: 'operation_conflict' },
    });
    expect(await backend.database.publication.count()).toBe(1);
  });

  it('allows only one competing activation at the same expected revision', async () => {
    const { administrator, firstVersion, thirdVersion, service } =
      await PublicationFixtures.prepare(backend);
    const outcomes = await Promise.allSettled([
      service.publish(
        PublicationFixtures.request(firstVersion.funnelIdentifier, firstVersion.identifier),
        administrator.identifier,
      ),
      service.publish(
        PublicationFixtures.request(firstVersion.funnelIdentifier, thirdVersion.identifier),
        administrator.identifier,
      ),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.find((outcome) => outcome.status === 'rejected')).toMatchObject({
      reason: { status: 409, code: 'stale_revision' },
    });
    expect(await backend.database.publication.count()).toBe(1);
  });

  it('rolls back pointer and revision when the audit insertion fails', async () => {
    const { firstVersion, service } = await PublicationFixtures.prepare(backend);
    await expect(
      service.publish(
        PublicationFixtures.request(firstVersion.funnelIdentifier, firstVersion.identifier),
        randomUUID(),
      ),
    ).rejects.toBeDefined();
    expect(
      await backend.database.funnel.findUniqueOrThrow({
        where: { identifier: firstVersion.funnelIdentifier },
      }),
    ).toMatchObject({ activeVersionIdentifier: null, revision: 0 });
    expect(await backend.database.publication.count()).toBe(0);
  });

  it.each(PublicationCases.CorruptedVersions)(
    'rejects corrupted $name before activation',
    async ({ data }) => {
      const { administrator, firstVersion, service } = await PublicationFixtures.prepare(backend);
      await backend.database.funnelVersion.update({
        where: { identifier: firstVersion.identifier },
        data,
      });
      await expect(
        service.publish(
          PublicationFixtures.request(firstVersion.funnelIdentifier, firstVersion.identifier),
          administrator.identifier,
        ),
      ).rejects.toMatchObject({ status: 422 });
      expect(await backend.database.publication.count()).toBe(0);
    },
  );

  it('rejects active noops and rollback without a predecessor', async () => {
    const { administrator, firstVersion, service } = await PublicationFixtures.prepare(backend);
    await expect(
      service.rollback(
        {
          operationIdentifier: randomUUID(),
          funnelIdentifier: firstVersion.funnelIdentifier,
          expectedRevision: 0,
        },
        administrator.identifier,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await service.publish(
      PublicationFixtures.request(firstVersion.funnelIdentifier, firstVersion.identifier),
      administrator.identifier,
    );
    await expect(
      service.publish(
        PublicationFixtures.request(firstVersion.funnelIdentifier, firstVersion.identifier, 1),
        administrator.identifier,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});
