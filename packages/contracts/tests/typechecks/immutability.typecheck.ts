import type { FunnelConfiguration, FunnelResult } from '../../source/index.js';
import { deeplyNestedCondition } from './conditions.typecheck.js';

declare const configuration: FunnelConfiguration;
declare const result: FunnelResult;

// @ts-expect-error Schema-derived configuration arrays must remain readonly.
configuration.experiment.variants.A.stepSequence.push('extra-step');

// @ts-expect-error Schema-derived nested objects must remain readonly.
configuration.session.ttlHours = 24;

// @ts-expect-error Schema-derived result arrays must remain readonly.
result.recommendations.push('extra-recommendation');

// @ts-expect-error Recursive configuration edges must remain readonly.
configuration.resultRules.push({ resultId: 'result', when: deeplyNestedCondition });
