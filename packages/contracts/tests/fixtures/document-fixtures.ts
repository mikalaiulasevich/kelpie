export const DocumentFixtures = {
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
