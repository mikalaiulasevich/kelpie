/** Dictionary lookups must never resolve inherited prototype properties. */
export function readOwnProperty<Value>(
  dictionary: Readonly<Record<string, Value>>,
  key: string,
): Value | undefined {
  return Object.hasOwn(dictionary, key) ? dictionary[key] : undefined;
}
