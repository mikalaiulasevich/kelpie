import { describe, expect, it } from 'vitest';

import { DocumentFixtures } from '../fixtures/document-fixtures.js';
import { DocumentCases } from '../cases/document-cases.js';
import { ConfigurationDocumentBounds } from '../../source/configurations/validation/configuration-document-bounds.js';
import { ConfigurationMessages } from '../../source/configurations/configuration-messages.js';
import {
  configurationLimits,
  DocumentAccountingPolicy,
} from '../../source/configurations/configuration-policy.js';

describe('configuration document bounds', () => {
  it.each(DocumentCases.nonJsonValues)('rejects non-JSON primitives: $name', ({ value }) => {
    expect(ConfigurationDocumentBounds.check(value)).toBe(ConfigurationMessages.JsonValuesRequired);
  });

  it.each(DocumentCases.nonFiniteNumbers)('rejects non-finite numbers: $name', ({ value }) => {
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
    const cycle = DocumentFixtures.circular();
    expect(ConfigurationDocumentBounds.check(cycle)).toBe(
      ConfigurationMessages.AcyclicDocumentRequired,
    );
    expect(ConfigurationDocumentBounds.check([shared, shared])).toBe(
      ConfigurationMessages.AcyclicDocumentRequired,
    );
  });

  it.each(DocumentCases.nonPlainObjects)('rejects non-plain objects: $name', ({ value }) => {
    expect(ConfigurationDocumentBounds.check(value)).toBe(
      ConfigurationMessages.PlainObjectsRequired,
    );
  });

  it.each(DocumentCases.reservedKeys)('rejects reserved key %s', (key) => {
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
    const value = DocumentFixtures.nested(configurationLimits.maximumDepth + 1, Infinity);

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
    expect(ConfigurationDocumentBounds.check(DocumentFixtures.tree(5))).toBe(
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
