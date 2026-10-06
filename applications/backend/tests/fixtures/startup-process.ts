import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, Socket, type Server } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { applicationDirectory } from '../../source/application/application-directory.js';

export const StartupProcessPolicy = {
  Host: '127.0.0.1',
  TimeoutMilliseconds: 8_000,
  SlowRequestExitMilliseconds: 15_000,
  SlowRequestTestMilliseconds: 25_000,
  SocketCloseMilliseconds: 1_000,
  PollMilliseconds: 50,
  RequestTimeoutMilliseconds: 500,
  MaximumOutputCharacters: 65_536,
  DirectoryPrefix: 'kelpie-startup-',
  DatabaseFilename: 'private-database-marker.sqlite',
} as const;

const StartupProcessMessages = {
  AddressUnavailable: 'Test listener has no network address.',
  ExitTimeout: 'Backend process did not exit within the test deadline.',
  StartupTimeout: 'Backend process did not become live within the test deadline.',
  PrematureExit: 'Backend process exited before becoming live.',
  RequestAcceptanceTimeout: 'Backend did not acknowledge the incomplete request.',
  SocketCloseTimeout: 'Incomplete request socket survived application shutdown.',
} as const;

interface StartupExit {
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
}

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

    if (address === null || typeof address === 'string') {
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

export class StartupProcessFixture {
  private output = '';
  private readonly exited: Promise<StartupExit>;

  private constructor(
    private readonly process: ChildProcess,
    private readonly directory: string,
    readonly databaseUrl: string,
  ) {
    this.exited = new Promise<StartupExit>((resolveExited, rejectExited) => {
      process.once('error', rejectExited);
      process.once('close', (code, signal) => resolveExited({ code, signal }));
    });
    process.stdout?.on('data', (chunk: Buffer) => this.capture(chunk));
    process.stderr?.on('data', (chunk: Buffer) => this.capture(chunk));
  }

  static async create(environment: NodeJS.ProcessEnv): Promise<StartupProcessFixture> {
    const directory = await mkdtemp(resolve(tmpdir(), StartupProcessPolicy.DirectoryPrefix));
    const databaseUrl = `file:${resolve(directory, StartupProcessPolicy.DatabaseFilename)}`;
    try {
      const process = spawn(globalThis.process.execPath, ['--import', 'tsx', 'source/main.ts'], {
        cwd: applicationDirectory,
        env: {
          ...globalThis.process.env,
          NODE_ENV: 'test',
          HOST: StartupProcessPolicy.Host,
          DATABASE_URL: databaseUrl,
          ...environment,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      return new StartupProcessFixture(process, directory, databaseUrl);
    } catch (error) {
      await rm(directory, { recursive: true, force: true });
      throw error;
    }
  }

  get diagnostics(): string {
    return this.output;
  }

  terminate(): void {
    this.process.kill('SIGTERM');
  }

  async waitForExit(
    timeoutMilliseconds: number = StartupProcessPolicy.TimeoutMilliseconds,
  ): Promise<StartupExit> {
    let deadline: Optional<NodeJS.Timeout>;

    try {
      return await Promise.race([
        this.exited,
        new Promise<never>((_, rejectDeadline) => {
          deadline = setTimeout(() => {
            this.process.kill('SIGKILL');
            rejectDeadline(new Error(StartupProcessMessages.ExitTimeout));
          }, timeoutMilliseconds);
        }),
      ]);
    } finally {
      clearTimeout(deadline);
    }
  }

  async waitUntilLive(port: number): Promise<void> {
    const deadline = Date.now() + StartupProcessPolicy.TimeoutMilliseconds;

    while (Date.now() < deadline) {
      if (this.process.exitCode !== null || this.process.signalCode !== null) {
        throw new Error(StartupProcessMessages.PrematureExit);
      }

      const response = await fetch(`http://${StartupProcessPolicy.Host}:${port}/api/health/live`, {
        signal: AbortSignal.timeout(StartupProcessPolicy.RequestTimeoutMilliseconds),
      }).catch(() => undefined);
      await response?.body?.cancel();

      if (response?.ok) {
        return;
      }

      await delay(StartupProcessPolicy.PollMilliseconds);
    }

    throw new Error(StartupProcessMessages.StartupTimeout);
  }

  async close(): Promise<void> {
    this.process.kill('SIGKILL');

    try {
      await this.waitForExit();
    } finally {
      await rm(this.directory, { recursive: true, force: true });
    }
  }

  private capture(chunk: Buffer): void {
    this.output = (this.output + chunk.toString()).slice(
      -StartupProcessPolicy.MaximumOutputCharacters,
    );
  }
}

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
