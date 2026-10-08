import { SessionPolicy } from '../../../source/sessions/session-policy.js';
import { SessionSnapshots } from '../../../source/sessions/session-snapshots.js';
import type { BackendApplicationFixture } from '../backend-application.js';
import { SessionBrowserFixture, SessionFlowFixture } from '../session-flow.js';

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
        data: { response: SessionSnapshots.read(operation.response, owner) },
      });
    }
    await backend.database.session.update({
      where: { identifier: owner.identifier },
      data: { initialState: initial },
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
