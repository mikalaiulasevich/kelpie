import { isBoolean, isNull, isPlainObject, isString } from 'es-toolkit/predicate';
import type { Prisma } from '../../../generated/prisma/client.js';
import { SessionPolicy } from '../../../source/sessions/session-policy.js';
import { SessionSnapshots } from '../../../source/sessions/session-snapshots.js';
import type { BackendApplicationFixture } from '../backend-application.js';
import { SessionBrowserFixture, SessionFlowFixture } from '../session-flow.js';

const FixtureJson = {
  value(value: unknown): Prisma.InputJsonValue | null {
    if (isNull(value) || isString(value) || isBoolean(value)) {
      return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(FixtureJson.value);
    }

    if (isPlainObject(value)) {
      return FixtureJson.object(value);
    }

    throw new Error('Invalid legacy snapshot fixture JSON');
  },

  object(value: object): Prisma.InputJsonObject {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, FixtureJson.value(child)]),
    );
  },
} as const;

export const SessionStorageCompactionFixture = {
  async prepare(backend: BackendApplicationFixture) {
    await SessionFlowFixture.prepare(backend);
    const browser = new SessionBrowserFixture(backend);
    const initial = await browser.create();
    const command = SessionFlowFixture.command(initial);
    const historical = await SessionFlowFixture.state(
      await browser.post('/current/continue', command),
    );
    const owner = await backend.database.session.findUniqueOrThrow({
      where: { identifier: initial.sessionIdentifier },
      include: SessionPolicy.RecordInclude,
    });
    const operations = await backend.database.sessionOperation.findMany({
      orderBy: [{ sessionIdentifier: 'asc' }, { operationIdentifier: 'asc' }],
    });

    for (const operation of operations) {
      await backend.database.sessionOperation.update({
        where: {
          sessionIdentifier_operationIdentifier: {
            sessionIdentifier: operation.sessionIdentifier,
            operationIdentifier: operation.operationIdentifier,
          },
        },
        data: { response: FixtureJson.object(SessionSnapshots.read(operation.response, owner)) },
      });
    }

    await backend.database.session.update({
      where: { identifier: owner.identifier },
      data: { initialState: FixtureJson.object(initial) },
    });

    return { browser, initial, command, historical, owner };
  },

  async rows(backend: BackendApplicationFixture) {
    const operations = await backend.database.sessionOperation.findMany({
      orderBy: [{ sessionIdentifier: 'asc' }, { operationIdentifier: 'asc' }],
    });
    const sessions = await backend.database.session.findMany({ orderBy: { identifier: 'asc' } });

    return { operations, sessions };
  },
} as const;
