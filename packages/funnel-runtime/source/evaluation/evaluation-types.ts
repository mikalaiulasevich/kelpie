import type { FunnelResult } from '@kelpie/contracts';
import type { AvailableRoute } from '../routes/route-types.js';

export interface EvaluatedFunnel {
  readonly route: AvailableRoute;
  readonly result: Optional<FunnelResult>;
}
