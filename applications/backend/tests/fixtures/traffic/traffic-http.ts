import assert from 'node:assert/strict';
import { isUndefined } from 'es-toolkit/predicate';
import type { BackendApplicationFixture } from '../backend-application.js';
import { TrafficPolicy } from '../../benchmarks/traffic/traffic-policy.js';
import { TrafficMessages } from '../../benchmarks/traffic/traffic-messages.js';

export class TrafficHttp {
  readonly measurements = new Map<
    string,
    { milliseconds: number[]; statuses: Record<string, number> }
  >();

  networkFailures = 0;

  constructor(readonly backend: BackendApplicationFixture) {}

  async request(path: string, body: unknown, cookie = '', visitor = 0): Promise<Response> {
    const started = performance.now();
    const response = await (async () => {
      try {
        const received = await this.backend.request(path, {
          method: isUndefined(body) ? 'GET' : 'POST',
          headers: {
            origin: TrafficPolicy.Origin,
            'content-type': 'application/json',
            'x-kelpie-administration': '1',
            'x-kelpie-session': '1',
            'x-kelpie-preview': '1',
            'x-forwarded-for': `10.${Math.floor(visitor / 65536) % 256}.${Math.floor(visitor / 256) % 256}.${visitor % 256}`,
            cookie,
          },
          ...(isUndefined(body) ? {} : { body: JSON.stringify(body) }),
          signal: AbortSignal.timeout(TrafficPolicy.RequestTimeoutMilliseconds),
        });
        // Include response transfer failures, not only connection failures.
        await received.clone().arrayBuffer();

        return received;
      } catch (error) {
        this.networkFailures += 1;
        throw error;
      }
    })();
    const key =
      path
        .replace(/configurations\/[^/]+\/preview/, 'configurations/:version/preview')
        .split('?')[0] ?? path;
    const measurement = this.measurements.get(key) ?? { milliseconds: [], statuses: {} };
    measurement.milliseconds.push(performance.now() - started);
    measurement.statuses[response.status] = (measurement.statuses[response.status] ?? 0) + 1;
    this.measurements.set(key, measurement);
    assert.equal(response.ok, true, `${TrafficMessages.RequestFailed} ${path} ${response.status}`);

    return response;
  }

  report() {
    return Object.fromEntries(
      [...this.measurements].map(([path, measurement]) => {
        const sorted = [...measurement.milliseconds].sort((left, right) => left - right);
        const percentile = (fraction: number) =>
          sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] ?? 0;

        return [
          path,
          {
            requests: sorted.length,
            statuses: measurement.statuses,
            p50: percentile(0.5),
            p95: percentile(0.95),
            p99: percentile(0.99),
            maximum: sorted.at(-1) ?? 0,
          },
        ];
      }),
    );
  }
}
