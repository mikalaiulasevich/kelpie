import assert from 'node:assert/strict';
import {
  createServer,
  request as requestHttp,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { isString, isUndefined } from 'es-toolkit/predicate';
import type { BackendApplicationFixture } from './backend-application.js';

const LostResponsePolicy = {
  DeadlineMilliseconds: 10_000,
  MaximumRequestBytes: 16_384,
} as const;

export class LostResponseProxy {
  private readonly server = createServer((request, response) => {
    void this.forward(request, response).catch((error: unknown) => {
      this.failures.push(error);
      response.destroy();
    });
  });

  private readonly failures: unknown[] = [];

  private droppedPath: Optional<string>;

  private committedBody: Optional<string>;

  private constructor(private readonly backend: BackendApplicationFixture) {}

  static async create(backend: BackendApplicationFixture): Promise<LostResponseProxy> {
    const proxy = new LostResponseProxy(backend);
    proxy.server.requestTimeout = LostResponsePolicy.DeadlineMilliseconds;

    try {
      await new Promise<void>((resolve, reject) => {
        proxy.server.once('error', reject);
        proxy.server.listen(0, '127.0.0.1', () => {
          proxy.server.off('error', reject);
          resolve();
        });
      });

      return proxy;
    } catch (error) {
      proxy.server.closeAllConnections();
      proxy.server.close();

      throw error;
    }
  }

  dropNextResponse(path: string): void {
    assert.ok(isUndefined(this.droppedPath));
    this.committedBody = undefined;
    this.droppedPath = path;
  }

  readCommittedBody(): unknown {
    assert.ok(!isUndefined(this.committedBody));

    return JSON.parse(this.committedBody);
  }

  request(path: string, options: RequestInit): Promise<Response> {
    const address = this.server.address();
    assert.ok(address && !isString(address));

    assert.ok(isString(options.body));
    const body = options.body;

    return new Promise<Response>((resolve, reject) => {
      const request = requestHttp(
        `http://127.0.0.1:${address.port}${path}`,
        {
          method: options.method ?? 'POST',
          headers: Object.fromEntries(new Headers(options.headers)),
          signal: AbortSignal.timeout(LostResponsePolicy.DeadlineMilliseconds),
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('error', reject);
          response.on('end', () => {
            const responseBody = Buffer.concat(chunks);

            try {
              assert.equal(responseBody.length, Number(response.headers['content-length']));
              resolve(
                new Response(responseBody, {
                  status: response.statusCode ?? 500,
                  headers: { 'content-type': 'application/json' },
                }),
              );
            } catch (error) {
              reject(error);
            }
          });
        },
      );
      request.on('error', reject);
      request.end(body);
    });
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          reject(error);

          return;
        }

        resolve();
      });
      this.server.closeAllConnections();
    });
    assert.deepEqual(this.failures, []);
  }

  private async forward(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const chunks: Buffer[] = [];
    let bytes = 0;

    for await (const chunk of request) {
      const buffer = Buffer.from(chunk);
      bytes += buffer.length;
      assert.ok(bytes <= LostResponsePolicy.MaximumRequestBytes);
      chunks.push(buffer);
    }

    const headers = new Headers();

    for (const [name, value] of Object.entries(request.headers)) {
      if (name !== 'host' && name !== 'connection' && !isUndefined(value)) {
        headers.set(name, Array.isArray(value) ? value.join(', ') : value);
      }
    }

    const path = request.url ?? '/';
    const upstream = await this.backend.request(path, {
      method: request.method ?? 'POST',
      headers,
      body: Buffer.concat(chunks),
      signal: AbortSignal.timeout(LostResponsePolicy.DeadlineMilliseconds),
    });
    const body = await upstream.text();

    // Consume the successful upstream response before disconnecting the client:
    // this loses the acknowledgement after the backend transaction committed.
    if (path === this.droppedPath) {
      assert.equal(upstream.status, 200);
      this.committedBody = body;
      this.droppedPath = undefined;
      response.writeHead(200, {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      });
      response.write(' ');
      response.socket?.destroy();

      return;
    }

    response.statusCode = upstream.status;
    response.setHeader('content-type', 'application/json');
    response.setHeader('content-length', Buffer.byteLength(body));
    response.end(body);
  }
}
