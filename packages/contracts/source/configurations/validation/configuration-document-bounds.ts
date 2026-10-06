import { isNull, isUndefined } from 'es-toolkit/predicate';
import { match, P } from 'ts-pattern';

import { ConfigurationMessages } from '../configuration-messages.js';
import { ConfigurationLimits, DocumentAccountingPolicy } from '../configuration-policy.js';

interface PendingDocumentValue {
  readonly value: unknown;
  readonly depth: number;
}

interface DocumentTraversal {
  readonly pending: PendingDocumentValue[];
  readonly visitedObjects: WeakSet<object>;
  estimatedBytes: number;
}

const DocumentInspection = {
  isObject(value: unknown): value is object {
    return !isNull(value) && typeof value === 'object';
  },

  isPlainContainer(value: object): boolean {
    const prototype: unknown = Object.getPrototypeOf(value);

    return Array.isArray(value) || prototype === Object.prototype || isNull(prototype);
  },

  inspectContainer(value: object, depth: number, traversal: DocumentTraversal): Optional<string> {
    if (!DocumentInspection.isPlainContainer(value)) {
      return ConfigurationMessages.PlainObjectsRequired;
    }

    if (traversal.visitedObjects.has(value)) {
      return ConfigurationMessages.AcyclicDocumentRequired;
    }

    traversal.visitedObjects.add(value);

    if (Object.keys(value).length > ConfigurationLimits.maximumNodes) {
      return ConfigurationMessages.DocumentPropertyLimit;
    }

    for (const [key, child] of Object.entries(value)) {
      if (DocumentAccountingPolicy.ReservedKeys.includes(key)) {
        return ConfigurationMessages.ReservedObjectKeys;
      }

      traversal.estimatedBytes +=
        key.length * DocumentAccountingPolicy.BytesPerCharacter +
        DocumentAccountingPolicy.PropertyOverheadBytes;
      traversal.pending.push({ value: child, depth: depth + 1 });
    }

    return undefined;
  },

  inspectValue(current: PendingDocumentValue, traversal: DocumentTraversal): Optional<string> {
    return match(current.value)
      .with(P.string, (value) => {
        traversal.estimatedBytes += value.length * DocumentAccountingPolicy.BytesPerCharacter;

        return undefined;
      })
      .with(P.number, (value) =>
        Number.isFinite(value) ? undefined : ConfigurationMessages.FiniteNumbersRequired,
      )
      .with(P.boolean, () => undefined)
      .with(null, () => undefined)
      .with(P.when(DocumentInspection.isObject), (value) =>
        DocumentInspection.inspectContainer(value, current.depth, traversal),
      )
      .otherwise(() => ConfigurationMessages.JsonValuesRequired);
  },
} as const;

export const ConfigurationDocumentBounds = {
  check(document: unknown): Optional<string> {
    const traversal: DocumentTraversal = {
      pending: [{ value: document, depth: 0 }],
      visitedObjects: new WeakSet<object>(),
      estimatedBytes: 0,
    };
    let nodeCount = 0;

    while (traversal.pending.length > 0) {
      const current = traversal.pending.pop();

      if (isUndefined(current)) {
        break;
      }

      nodeCount += 1;

      if (
        nodeCount > ConfigurationLimits.maximumNodes ||
        current.depth > ConfigurationLimits.maximumDepth
      ) {
        return ConfigurationMessages.DocumentTraversalLimit;
      }

      const issue = DocumentInspection.inspectValue(current, traversal);

      if (!isUndefined(issue)) {
        return issue;
      }

      if (traversal.estimatedBytes > ConfigurationLimits.maximumDocumentBytes) {
        return ConfigurationMessages.DocumentSizeLimit;
      }
    }

    return undefined;
  },
} as const;
