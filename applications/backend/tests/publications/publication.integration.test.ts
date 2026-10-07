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
    const { administrator, first, third, service } = await PublicationFixtures.prepare(backend);
    const pinned = await backend.database.session.create({
      data: DatabaseRecords.sessionData(first.identifier),
    });
    const initial = PublicationFixtures.request(first.funnelIdentifier, first.identifier);
    const original = await service.publish(initial, administrator.identifier);
    await service.publish(
      PublicationFixtures.request(first.funnelIdentifier, third.identifier, 1),
      administrator.identifier,
    );
    const rollback = {
      operationIdentifier: randomUUID(),
      funnelIdentifier: first.funnelIdentifier,
      expectedRevision: 2,
    };
    const restored = await service.rollback(rollback, administrator.identifier);
    expect(restored).toMatchObject({
      targetVersionIdentifier: first.identifier,
      previousVersionIdentifier: third.identifier,
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
      await service.history({ funnelIdentifier: first.funnelIdentifier, limit: '2' }),
    ).toMatchObject({
      funnel: { activeVersionIdentifier: first.identifier, revision: 3 },
      items: [{ revision: 3 }, { revision: 2 }],
      nextOffset: 2,
    });
    expect(
      await service.history({ funnelIdentifier: first.funnelIdentifier, offset: '2' }),
    ).toMatchObject({ items: [{ revision: 1 }], nextOffset: null });
  });

  it('deduplicates simultaneous exact retries', async () => {
    const { administrator, first, service } = await PublicationFixtures.prepare(backend);
    const request = PublicationFixtures.request(first.funnelIdentifier, first.identifier);
    const [original, repeated] = await Promise.all([
      service.publish(request, administrator.identifier),
      service.publish(request, administrator.identifier),
    ]);
    expect(repeated).toEqual(original);
    expect(await backend.database.publication.count()).toBe(1);
  });

  it('rejects changed payload and administrator identity on an existing operation', async () => {
    const { administrator, first, third, service } = await PublicationFixtures.prepare(backend);
    const request = PublicationFixtures.request(first.funnelIdentifier, first.identifier);
    await service.publish(request, administrator.identifier);
    await expect(
      service.publish(
        { ...request, targetVersionIdentifier: third.identifier },
        administrator.identifier,
      ),
    ).rejects.toMatchObject({ status: 409, code: 'operation_conflict' });
    await expect(service.publish(request, randomUUID())).rejects.toMatchObject({ status: 409 });
    expect(await backend.database.publication.count()).toBe(1);
  });

  it('rejects a concurrent conflicting retry without creating a second publication', async () => {
    const { administrator, first, third, service } = await PublicationFixtures.prepare(backend);
    const request = PublicationFixtures.request(first.funnelIdentifier, first.identifier);
    const outcomes = await Promise.allSettled([
      service.publish(request, administrator.identifier),
      service.publish(
        { ...request, targetVersionIdentifier: third.identifier },
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
    const { administrator, first, third, service } = await PublicationFixtures.prepare(backend);
    const outcomes = await Promise.allSettled([
      service.publish(
        PublicationFixtures.request(first.funnelIdentifier, first.identifier),
        administrator.identifier,
      ),
      service.publish(
        PublicationFixtures.request(first.funnelIdentifier, third.identifier),
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
    const { first, service } = await PublicationFixtures.prepare(backend);
    await expect(
      service.publish(
        PublicationFixtures.request(first.funnelIdentifier, first.identifier),
        randomUUID(),
      ),
    ).rejects.toBeDefined();
    expect(
      await backend.database.funnel.findUniqueOrThrow({
        where: { identifier: first.funnelIdentifier },
      }),
    ).toMatchObject({ activeVersionIdentifier: null, revision: 0 });
    expect(await backend.database.publication.count()).toBe(0);
  });

  it.each(PublicationCases.CorruptedVersions)(
    'rejects corrupted $name before activation',
    async ({ data }) => {
      const { administrator, first, service } = await PublicationFixtures.prepare(backend);
      await backend.database.funnelVersion.update({
        where: { identifier: first.identifier },
        data,
      });
      await expect(
        service.publish(
          PublicationFixtures.request(first.funnelIdentifier, first.identifier),
          administrator.identifier,
        ),
      ).rejects.toMatchObject({ status: 422 });
      expect(await backend.database.publication.count()).toBe(0);
    },
  );

  it('rejects active noops and rollback without a predecessor', async () => {
    const { administrator, first, service } = await PublicationFixtures.prepare(backend);
    await expect(
      service.rollback(
        {
          operationIdentifier: randomUUID(),
          funnelIdentifier: first.funnelIdentifier,
          expectedRevision: 0,
        },
        administrator.identifier,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await service.publish(
      PublicationFixtures.request(first.funnelIdentifier, first.identifier),
      administrator.identifier,
    );
    await expect(
      service.publish(
        PublicationFixtures.request(first.funnelIdentifier, first.identifier, 1),
        administrator.identifier,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});
