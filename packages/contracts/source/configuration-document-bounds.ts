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

export function checkDocumentBounds(document: unknown): string | undefined {
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
      return 'Document exceeds nesting or node limits.';
    }

    if (typeof current.value === 'string') {
      estimatedBytes += current.value.length * 3;
    } else if (typeof current.value === 'number' && !Number.isFinite(current.value)) {
      return 'Numbers must be finite.';
    } else if (current.value !== null && typeof current.value === 'object') {
      const prototype: unknown = Object.getPrototypeOf(current.value);

      if (!Array.isArray(current.value) && prototype !== Object.prototype && prototype !== null) {
        return 'Document objects must be plain JSON objects.';
      }

      if (visitedObjects.has(current.value)) {
        return 'Document must be an acyclic JSON value without shared object references.';
      }

      visitedObjects.add(current.value);
      const keys = Object.keys(current.value);

      if (keys.length > configurationLimits.maximumNodes) {
        return 'Document contains too many properties.';
      }

      for (const [key, value] of Object.entries(current.value)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return 'Reserved object keys are not allowed.';
        }

        estimatedBytes += key.length * 3 + 8;
        pending.push({ value, depth: current.depth + 1 });
      }
    } else if (current.value !== null && !['boolean', 'number'].includes(typeof current.value)) {
      return 'Document contains a non-JSON value.';
    }

    if (estimatedBytes > configurationLimits.maximumDocumentBytes) {
      return 'Document exceeds the size limit.';
    }
  }

  return undefined;
}
