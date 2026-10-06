import { describe, expect, it } from 'vitest';

import { DictionaryAccess } from '../../source/index.js';

describe('own dictionary properties', () => {
  it('does not resolve inherited properties or missing entries', () => {
    const dictionary = { present: 'value' };

    expect(DictionaryAccess.readOwn(dictionary, 'present')).toBe('value');
    expect(DictionaryAccess.readOwn(dictionary, 'missing')).toBeUndefined();
    expect(DictionaryAccess.readOwn(dictionary, 'constructor')).toBeUndefined();
    expect(DictionaryAccess.readOwn(dictionary, 'toString')).toBeUndefined();
    expect(DictionaryAccess.readOwn(dictionary, '__proto__')).toBeUndefined();
  });

  it('supports null prototypes and own keys that shadow prototype names', () => {
    const dictionary: Dictionary<string, Optional<string>> = {
      constructor: 'own constructor',
      hasOwnProperty: 'own value',
      missingValue: undefined,
    };
    Object.setPrototypeOf(dictionary, null);

    expect(DictionaryAccess.readOwn(dictionary, 'constructor')).toBe('own constructor');
    expect(DictionaryAccess.readOwn(dictionary, 'hasOwnProperty')).toBe('own value');
    expect(DictionaryAccess.readOwn(dictionary, 'missingValue')).toBeUndefined();
  });
});
