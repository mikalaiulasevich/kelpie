import type { Optional } from './optional-types.js';

/** Dictionary lookups must never resolve inherited prototype properties. */
export function readOwnProperty<Value>(
  dictionary: Readonly<Record<string, Value>>,
  key: string,
): Optional<Value> {
  return Object.hasOwn(dictionary, key) ? dictionary[key] : undefined;
}
