export const DictionaryAccess = {
  /** Dictionary lookups must never resolve inherited prototype properties. */
  readOwn<Value>(dictionary: ReadonlyDictionary<string, Value>, key: string): Optional<Value> {
    return Object.hasOwn(dictionary, key) ? dictionary[key] : undefined;
  },
} as const;
