import { describe, expect, it } from 'vitest';

import { ConfigurationDocumentBounds } from '../source/configuration-document-bounds.js';
import { ConfigurationMessages } from '../source/configuration-messages.js';
import { configurationLimits, DocumentAccountingPolicy } from '../source/configuration-policy.js';

describe('configuration document bounds', () => {
  it.each([undefined, () => undefined, Symbol('value'), BigInt(1)])(
    'rejects non-JSON primitives: %s',
    (value) => {
      expect(ConfigurationDocumentBounds.check(value)).toBe(
        ConfigurationMessages.JsonValuesRequired,
      );
    },
  );

  it.each([NaN, Infinity, -Infinity])('rejects non-finite numbers: %s', (value) => {
    expect(ConfigurationDocumentBounds.check(value)).toBe(
      ConfigurationMessages.FiniteNumbersRequired,
    );
  });

  it('accepts JSON primitives and plain containers, including null prototypes', () => {
    expect(
      ConfigurationDocumentBounds.check([
        null,
        false,
        true,
        0,
        '',
        { answer: 1 },
        Object.create(null),
      ]),
    ).toBeUndefined();
  });

  it('rejects both cycles and shared references', () => {
    const shared = { answer: 1 };
    const cycle: Record<string, unknown> = {};
    cycle['self'] = cycle;
    expect(ConfigurationDocumentBounds.check(cycle)).toBe(
      ConfigurationMessages.AcyclicDocumentRequired,
    );
    expect(ConfigurationDocumentBounds.check([shared, shared])).toBe(
      ConfigurationMessages.AcyclicDocumentRequired,
    );
  });

  it.each([new Date(), new Map(), Object.create({ inherited: true })])(
    'rejects non-plain objects',
    (value) => {
      expect(ConfigurationDocumentBounds.check(value)).toBe(
        ConfigurationMessages.PlainObjectsRequired,
      );
    },
  );

  it.each(DocumentAccountingPolicy.reservedKeys)('rejects reserved key %s', (key) => {
    expect(ConfigurationDocumentBounds.check({ [key]: null })).toBe(
      ConfigurationMessages.ReservedObjectKeys,
    );
  });

  it('preserves reserved-key precedence over estimated-size failures', () => {
    const oversizedKey = 'a'.repeat(configurationLimits.maximumDocumentBytes);
    expect(ConfigurationDocumentBounds.check({ [oversizedKey]: null, constructor: null })).toBe(
      ConfigurationMessages.ReservedObjectKeys,
    );
  });

  it('preserves last-in-first-out traversal and first-issue selection', () => {
    expect(ConfigurationDocumentBounds.check({ nonJson: undefined, nonFinite: Infinity })).toBe(
      ConfigurationMessages.FiniteNumbersRequired,
    );
    expect(ConfigurationDocumentBounds.check({ nonFinite: Infinity, nonJson: undefined })).toBe(
      ConfigurationMessages.JsonValuesRequired,
    );
  });

  it('bounds depth before examining values beyond the limit', () => {
    let value: unknown = Infinity;

    for (let depth = 0; depth <= configurationLimits.maximumDepth; depth += 1) {
      value = { child: value };
    }

    expect(ConfigurationDocumentBounds.check(value)).toBe(
      ConfigurationMessages.DocumentTraversalLimit,
    );
  });

  it('bounds object property counts before visiting children', () => {
    const oversized = Object.fromEntries(
      Array.from({ length: configurationLimits.maximumNodes + 1 }, (_, index) => [index, null]),
    );
    expect(ConfigurationDocumentBounds.check(oversized)).toBe(
      ConfigurationMessages.DocumentPropertyLimit,
    );
  });

  it('bounds total visited nodes across nested containers', () => {
    const createTree = (depth: number): unknown =>
      depth === 0 ? null : Array.from({ length: 8 }, () => createTree(depth - 1));

    expect(ConfigurationDocumentBounds.check(createTree(5))).toBe(
      ConfigurationMessages.DocumentTraversalLimit,
    );
  });

  it('enforces conservative string byte accounting at the boundary', () => {
    const maximumCharacters = Math.floor(
      configurationLimits.maximumDocumentBytes / DocumentAccountingPolicy.bytesPerCharacter,
    );
    expect(ConfigurationDocumentBounds.check('a'.repeat(maximumCharacters))).toBeUndefined();
    expect(ConfigurationDocumentBounds.check('a'.repeat(maximumCharacters + 1))).toBe(
      ConfigurationMessages.DocumentSizeLimit,
    );
  });
});
