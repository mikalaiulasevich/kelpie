import { isNull, isString } from 'es-toolkit/predicate';
import { createServer, type Server } from 'node:net';
import { StartupProcessPolicy } from './startup-policy.js';
import { StartupProcessMessages } from './startup-messages.js';

export class StartupPortFixture {
  private constructor(
    private readonly server: Server,
    readonly port: number,
  ) {}

  static async create(): Promise<StartupPortFixture> {
    const server = createServer();
    await new Promise<void>((resolveListening, rejectListening) => {
      server.once('error', rejectListening);
      server.listen(0, StartupProcessPolicy.Host, resolveListening);
    });
    const address = server.address();

    if (isNull(address) || isString(address)) {
      server.close();
      throw new Error(StartupProcessMessages.AddressUnavailable);
    }

    return new StartupPortFixture(server, address.port);
  }

  async close(): Promise<void> {
    if (!this.server.listening) {
      return;
    }

    await new Promise<void>((resolveClosed, rejectClosed) => {
      this.server.close((error) => (error ? rejectClosed(error) : resolveClosed()));
    });
  }
}
