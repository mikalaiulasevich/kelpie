import { Socket } from 'node:net';
import { StartupProcessPolicy } from './startup-policy.js';
import { StartupProcessMessages } from './startup-messages.js';

export class IncompleteRequestFixture {
  private readonly socket = new Socket();
  private readonly closed: Promise<void>;

  private constructor() {
    this.closed = new Promise<void>((resolveClosed) => {
      this.socket.once('close', resolveClosed);
    });
    // Forced server shutdown may reset the connection; close remains the completion signal.
    this.socket.on('error', () => this.socket.destroy());
  }

  static async create(port: number): Promise<IncompleteRequestFixture> {
    const fixture = new IncompleteRequestFixture();

    try {
      await fixture.begin(port);

      return fixture;
    } catch (error) {
      fixture.close();
      throw error;
    }
  }

  async waitForClose(): Promise<void> {
    let deadline: Optional<NodeJS.Timeout>;

    try {
      await Promise.race([
        this.closed,
        new Promise<never>((_, rejectDeadline) => {
          deadline = setTimeout(
            () => rejectDeadline(new Error(StartupProcessMessages.SocketCloseTimeout)),
            StartupProcessPolicy.SocketCloseMilliseconds,
          );
        }),
      ]);
    } finally {
      clearTimeout(deadline);
    }
  }

  close(): void {
    this.socket.destroy();
  }

  private async begin(port: number): Promise<void> {
    let deadline: Optional<NodeJS.Timeout>;

    try {
      await new Promise<void>((resolveAccepted, rejectAccepted) => {
        let response = '';
        deadline = setTimeout(
          () => rejectAccepted(new Error(StartupProcessMessages.RequestAcceptanceTimeout)),
          StartupProcessPolicy.TimeoutMilliseconds,
        );
        this.socket.once('error', rejectAccepted);
        this.socket.on('data', (chunk: Buffer) => {
          response += chunk.toString();

          if (response.includes('HTTP/1.1 100 Continue\r\n\r\n')) {
            this.socket.removeListener('error', rejectAccepted);
            resolveAccepted();
          }
        });
        this.socket.connect(port, StartupProcessPolicy.Host, () => {
          this.socket.write(
            'POST /api/health/live HTTP/1.1\r\n' +
              `Host: ${StartupProcessPolicy.Host}:${port}\r\n` +
              'Content-Type: application/json\r\n' +
              'Content-Length: 100\r\n' +
              'Expect: 100-continue\r\n\r\n',
          );
        });
      });
      await new Promise<void>((resolveWritten, rejectWritten) => {
        this.socket.write('{', (error) => (error ? rejectWritten(error) : resolveWritten()));
      });
    } finally {
      clearTimeout(deadline);
    }
  }
}
