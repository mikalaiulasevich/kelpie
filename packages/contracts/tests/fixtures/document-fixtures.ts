export const DocumentFixtures = {
  jsonValues(): ReadonlyList<unknown> {
    return [null, false, true, 0, '', { answer: 1 }, Object.create(null)];
  },

  sharedReferences(): ReadonlyList<object> {
    const shared = { answer: 1 };

    return [shared, shared];
  },

  properties(count: number): ReadonlyDictionary<string, null> {
    return Object.fromEntries(Array.from({ length: count }, (_, index) => [index, null]));
  },

  circular(): Record<string, unknown> {
    const value: Record<string, unknown> = {};
    value['self'] = value;

    return value;
  },

  nested(depth: number, leaf: unknown = {}): unknown {
    let value = leaf;
    for (let level = 0; level < depth; level += 1) {
      value = { child: value };
    }

    return value;
  },

  tree(depth: number): unknown {
    return depth === 0 ? null : Array.from({ length: 8 }, () => DocumentFixtures.tree(depth - 1));
  },
} as const;
