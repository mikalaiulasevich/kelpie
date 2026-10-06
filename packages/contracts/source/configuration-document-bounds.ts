import { ConfigurationMessages } from './configuration-messages.js';

interface PendingDocumentValue {
  readonly value: unknown;
  readonly depth: number;
}

export const configurationLimits = Object.freeze({
  maximumDocumentBytes: 262144,
  maximumDepth: 24,
  maximumNodes: 20000,
  maximumIssues: 30,
});

export function checkDocumentBounds(document: unknown): Optional<string> {
  const pending: PendingDocumentValue[] = [{ value: document, depth: 0 }];
  const visitedObjects = new WeakSet<object>();
  let nodeCount = 0;
  let estimatedBytes = 0;

  while (pending.length > 0) {
    const current = pending.pop();

    if (current === undefined) {
      break;
    }

    nodeCount += 1;

    if (
      nodeCount > configurationLimits.maximumNodes ||
      current.depth > configurationLimits.maximumDepth
    ) {
      return ConfigurationMessages.DocumentTraversalLimit;
    }

    if (typeof current.value === 'string') {
      estimatedBytes += current.value.length * 3;
    } else if (typeof current.value === 'number' && !Number.isFinite(current.value)) {
      return ConfigurationMessages.FiniteNumbersRequired;
    } else if (current.value !== null && typeof current.value === 'object') {
      const prototype: unknown = Object.getPrototypeOf(current.value);

      if (!Array.isArray(current.value) && prototype !== Object.prototype && prototype !== null) {
        return ConfigurationMessages.PlainObjectsRequired;
      }

      if (visitedObjects.has(current.value)) {
        return ConfigurationMessages.AcyclicDocumentRequired;
      }

      visitedObjects.add(current.value);
      const keys = Object.keys(current.value);

      if (keys.length > configurationLimits.maximumNodes) {
        return ConfigurationMessages.DocumentPropertyLimit;
      }

      for (const [key, value] of Object.entries(current.value)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return ConfigurationMessages.ReservedObjectKeys;
        }

        estimatedBytes += key.length * 3 + 8;
        pending.push({ value, depth: current.depth + 1 });
      }
    } else if (current.value !== null && !['boolean', 'number'].includes(typeof current.value)) {
      return ConfigurationMessages.JsonValuesRequired;
    }

    if (estimatedBytes > configurationLimits.maximumDocumentBytes) {
      return ConfigurationMessages.DocumentSizeLimit;
    }
  }

  return undefined;
}
