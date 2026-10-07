import { Socket } from 'node:net';
import { StartupProcessPolicy } from './startup-policy.js';
import { StartupProcessMessages } from './startup-messages.js';
import { StartupDeadline } from './startup-deadline.js';

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
      await fixture.waitForAcceptance(port);
      await fixture.writePartialBody();

      return fixture;
    } catch (error) {
      fixture.close();
      throw error;
    }
  }

  async waitForClose(): Promise<void> {
    await StartupDeadline.wait(this.closed, StartupProcessPolicy.SocketCloseMilliseconds, () => {
      throw new Error(StartupProcessMessages.SocketCloseTimeout);
    });
  }

  close(): void {
    this.socket.destroy();
  }

  private async waitForAcceptance(port: number): Promise<void> {
    const accepted = new Promise<void>((resolveAccepted, rejectAccepted) => {
      let response = '';
      this.socket.once('error', rejectAccepted);
      this.socket.on('data', (chunk: Buffer) => {
        response = (response + chunk.toString()).slice(
          -StartupProcessPolicy.MaximumOutputCharacters,
        );

        if (response.includes('HTTP/1.1 100 Continue\r\n\r\n')) {
          this.socket.removeListener('error', rejectAccepted);
          resolveAccepted();
        }
      });
      this.socket.connect(port, StartupProcessPolicy.Host, () => this.writeHeaders(port));
    });

    try {
      await StartupDeadline.wait(accepted, StartupProcessPolicy.TimeoutMilliseconds, () => {
        throw new Error(StartupProcessMessages.RequestAcceptanceTimeout);
      });
    } finally {
      this.socket.removeAllListeners('data');
    }
  }

  private writeHeaders(port: number): void {
    this.socket.write(
      'POST /api/health/live HTTP/1.1\r\n' +
        `Host: ${StartupProcessPolicy.Host}:${port}\r\n` +
        'Content-Type: application/json\r\n' +
        'Content-Length: 100\r\n' +
        'Expect: 100-continue\r\n\r\n',
    );
  }

  private async writePartialBody(): Promise<void> {
    await new Promise<void>((resolveWritten, rejectWritten) => {
      this.socket.write('{', (error) => (error ? rejectWritten(error) : resolveWritten()));
    });
  }
}
