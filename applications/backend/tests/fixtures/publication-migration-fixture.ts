import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const PublicationMigrationFiles = {
  Initial: '20261006000100_initial_foundation',
  OperationScope: '20261006000200_session_operation_scope',
  Revision: '20261007000100_publication_revision',
  SessionCommands: '20261007000200_session_commands',
} as const;

const SessionMigrationStatements = {
  OtherOwner: `INSERT INTO Session (identifier, accessTokenHash, versionIdentifier, experimentIdentifier,
    variant, assignmentSource, trafficOrigin, acquisitionParameters, currentStepIdentifier, expiresAt)
    VALUES ('other-session', 'other-hash', 'work-v1', 'experiment', 'A', 'random', 'synthetic',
      '{}', 'team_size', '2030-01-01T00:00:00.000Z');
    INSERT INTO SessionOperation (operationIdentifier, sessionIdentifier, requestFingerprint, response)
    VALUES ('other-operation', 'other-session', 'other-fingerprint', '{}');`,
  InsertTransition: `INSERT INTO SessionTransition (identifier, sessionIdentifier, operationIdentifier,
    revision, kind, fromStepIdentifier, toStepIdentifier)
    VALUES (?, ?, ?, ?, 'forward', 'team_size', 'result')`,
  Transitions: `SELECT sessionIdentifier, operationIdentifier, revision FROM SessionTransition
    ORDER BY sessionIdentifier, revision`,
} as const;

const PublicationMigrationStatements = {
  Seed: `
    INSERT INTO Administrator (identifier, username, passwordHash) VALUES ('administrator', 'owner', 'hash');
    INSERT INTO Funnel (identifier, revision) VALUES ('work', 0), ('other', 9), ('empty', 0);
    INSERT INTO FunnelVersion (identifier, funnelIdentifier, version, schemaVersion, document, checksum)
      VALUES ('work-v1', 'work', 1, '1.0', '{}', 'first'),
             ('work-v2', 'work', 2, '1.0', '{}', 'second'),
             ('other-v1', 'other', 1, '1.0', '{}', 'third');
    UPDATE Funnel SET activeVersionIdentifier = 'work-v2' WHERE identifier = 'work';
    UPDATE Funnel SET activeVersionIdentifier = 'other-v1' WHERE identifier = 'other';
    INSERT INTO Publication (identifier, operationIdentifier, requestFingerprint, action, funnelIdentifier,
      targetVersionIdentifier, previousVersionIdentifier, administratorIdentifier, createdAt)
      VALUES ('z-first', 'operation-first', 'fingerprint-first', 'publish', 'work',
                'work-v1', NULL, 'administrator', '2026-01-02T00:00:00.000Z'),
             ('a-second', 'operation-second', 'fingerprint-second', 'publish', 'work',
                'work-v2', 'work-v1', 'administrator', '2026-01-02T00:00:00.000Z'),
             ('older', 'operation-older', 'fingerprint-older', 'publish', 'work',
                'work-v1', NULL, 'administrator', '2026-01-01T00:00:00.000Z'),
             ('other', 'operation-other', 'fingerprint-other', 'publish', 'other',
                'other-v1', NULL, 'administrator', '2026-01-01T00:00:00.000Z');
    INSERT INTO Session (identifier, accessTokenHash, versionIdentifier, experimentIdentifier, variant,
      assignmentSource, trafficOrigin, acquisitionParameters, currentStepIdentifier, expiresAt)
      VALUES ('old-session', 'session-hash', 'work-v1', 'experiment', 'B', 'random', 'synthetic',
              '{"utm_campaign":"legacy"}', 'team_size', '2030-01-01T00:00:00.000Z');
    INSERT INTO SessionAnswer (sessionIdentifier, stepIdentifier, value, updatedAt)
      VALUES ('old-session', 'team_size', '12', '2026-01-01T00:00:00.000Z');
    INSERT INTO SessionOperation (operationIdentifier, sessionIdentifier, requestFingerprint, response)
      VALUES ('old-operation', 'old-session', 'old-fingerprint', '{"revision":1}');
    INSERT INTO Event (identifier, contentFingerprint, sessionIdentifier, name, source,
      clientTimestamp, stepIdentifier, properties)
      VALUES ('old-event', 'event-fingerprint', 'old-session', 'step_viewed', 'client',
              '2026-01-01T00:00:00.000Z', 'team_size', '{"step_type":"number"}');`,
  HistoricalPublications: `SELECT identifier, operationIdentifier, requestFingerprint, action,
    funnelIdentifier, targetVersionIdentifier, previousVersionIdentifier, administratorIdentifier,
    createdAt FROM Publication ORDER BY identifier`,
  HistoricalFunnels:
    'SELECT identifier, activeVersionIdentifier, createdAt FROM Funnel ORDER BY identifier',
  Sessions: 'SELECT * FROM Session ORDER BY identifier',
  Answers: 'SELECT * FROM SessionAnswer ORDER BY sessionIdentifier, stepIdentifier',
  Operations: 'SELECT * FROM SessionOperation ORDER BY sessionIdentifier, operationIdentifier',
  Events: 'SELECT * FROM Event ORDER BY identifier',
  Versions: 'SELECT * FROM FunnelVersion ORDER BY identifier',
  PublicationRevisions: 'SELECT identifier, revision FROM Publication ORDER BY identifier',
  FunnelRevisions: 'SELECT identifier, revision FROM Funnel ORDER BY identifier',
  ForeignKeys: 'PRAGMA foreign_key_check',
  DuplicateRevision: `INSERT INTO Publication (identifier, operationIdentifier, requestFingerprint,
    revision, action, funnelIdentifier, targetVersionIdentifier, administratorIdentifier)
    VALUES ('duplicate', 'duplicate-operation', 'fingerprint', 3, 'publish', 'work', 'work-v2', 'administrator')`,
} as const;

export class PublicationMigrationFixture {
  private readonly database = new DatabaseSync(':memory:');

  private constructor() {}

  static create(): PublicationMigrationFixture {
    const fixture = new PublicationMigrationFixture();

    try {
      fixture.apply(PublicationMigrationFiles.Initial);
      fixture.apply(PublicationMigrationFiles.OperationScope);
      fixture.database.exec(PublicationMigrationStatements.Seed);

      return fixture;
    } catch (error) {
      fixture.close();
      throw error;
    }
  }

  migrate(): void {
    this.apply(PublicationMigrationFiles.Revision);
  }

  migrateSessions(): void {
    this.migrate();
    this.apply(PublicationMigrationFiles.SessionCommands);
  }

  prepareOtherSession(): void {
    this.database.exec(SessionMigrationStatements.OtherOwner);
  }

  insertTransition(sessionIdentifier: string, operationIdentifier: string, revision: number): void {
    this.database
      .prepare(SessionMigrationStatements.InsertTransition)
      .run(randomUUID(), sessionIdentifier, operationIdentifier, revision);
  }

  transitions() {
    return this.database.prepare(SessionMigrationStatements.Transitions).all();
  }

  historicalRows() {
    return {
      publications: this.database
        .prepare(PublicationMigrationStatements.HistoricalPublications)
        .all(),
      funnels: this.database.prepare(PublicationMigrationStatements.HistoricalFunnels).all(),
      versions: this.database.prepare(PublicationMigrationStatements.Versions).all(),
      sessions: this.database.prepare(PublicationMigrationStatements.Sessions).all(),
      answers: this.database.prepare(PublicationMigrationStatements.Answers).all(),
      operations: this.database.prepare(PublicationMigrationStatements.Operations).all(),
      events: this.database.prepare(PublicationMigrationStatements.Events).all(),
    };
  }

  revisions() {
    return {
      publications: this.database
        .prepare(PublicationMigrationStatements.PublicationRevisions)
        .all(),
      funnels: this.database.prepare(PublicationMigrationStatements.FunnelRevisions).all(),
    };
  }

  foreignKeyViolations() {
    return this.database.prepare(PublicationMigrationStatements.ForeignKeys).all();
  }

  insertDuplicateRevision(): void {
    this.database.exec(PublicationMigrationStatements.DuplicateRevision);
  }

  close(): void {
    this.database.close();
  }

  private apply(directory: string): void {
    const migration = new URL(
      `../../prisma/migrations/${directory}/migration.sql`,
      import.meta.url,
    );
    this.database.exec(readFileSync(migration, 'utf8'));
  }
}
