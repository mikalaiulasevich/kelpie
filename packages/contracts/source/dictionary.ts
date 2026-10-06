/** Dictionary lookups must never resolve inherited prototype properties. */
export function readOwnProperty<Value>(
  dictionary: ReadonlyDictionary<string, Value>,
  key: string,
): Optional<Value> {
  return Object.hasOwn(dictionary, key) ? dictionary[key] : undefined;
}
