import { isNull, isString } from 'es-toolkit/predicate';
import { createServer } from 'node:http';
import { once } from 'node:events';

export const RemoteDatabaseRequestFixture = {
  async stalled<Result>(operation: (url: string) => Promise<Result>): Promise<Result> {
    const server = createServer((_request, response) => {
      response.writeHead(200);
      response.write('partial response');
    });

    try {
      server.listen(0, '127.0.0.1');
      await once(server, 'listening');
      const address = server.address();

      if (isNull(address) || isString(address)) {
        throw new Error('Expected a listening TCP address.');
      }

      return await operation(`http://127.0.0.1:${address.port}`);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
} as const;
