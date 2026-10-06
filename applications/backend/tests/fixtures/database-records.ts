import type { DatabaseService } from '../../source/database/database.service.js';

export const DatabaseRecords = {
  sessionData(versionIdentifier: string) {
    return {
      versionIdentifier,
      experimentIdentifier: 'test-experiment',
      variant: 'A',
      assignmentSource: 'random',
      trafficOrigin: 'synthetic',
      acquisitionParameters: {},
      currentStepIdentifier: 'welcome',
      expiresAt: new Date('2030-01-01T00:00:00Z'),
    };
  },

  async createOperationOwners(database: DatabaseService['client']) {
    const { session } = await DatabaseRecords.createSession(database);
    const otherSession = await database.session.create({
      data: DatabaseRecords.sessionData(session.versionIdentifier),
    });

    return { session, otherSession };
  },

  operation(sessionIdentifier: string) {
    return {
      operationIdentifier: 'same-operation',
      sessionIdentifier,
      requestFingerprint: 'test-intent',
      response: { revision: 1 },
    };
  },

  async createSession(database: DatabaseService['client']) {
    await database.funnel.create({ data: { identifier: 'test-funnel' } });
    const version = await database.funnelVersion.create({
      data: {
        funnelIdentifier: 'test-funnel',
        version: 1,
        schemaVersion: '1.0',
        document: {},
        checksum: 'test-checksum',
      },
    });
    const session = await database.session.create({
      data: DatabaseRecords.sessionData(version.identifier),
    });

    return {
      session,
      version,
      eventData: {
        identifier: 'test-event',
        contentFingerprint: 'test-fingerprint',
        sessionIdentifier: session.identifier,
        name: 'session_started',
        source: 'server',
        clientTimestamp: new Date('2026-01-01T00:00:00Z'),
        properties: {},
      },
    };
  },
} as const;
