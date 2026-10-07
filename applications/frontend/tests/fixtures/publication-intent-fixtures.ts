import { vi } from 'vitest';
import type { PublicationIntent } from '../../source/configuration-management/publication-intents';

export const PublicationIntentFixture = {
  storage() {
    const values = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        values.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        values.delete(key);
      }),
    };
    vi.stubGlobal('sessionStorage', storage);

    return { values, storage };
  },

  publish(): PublicationIntent {
    return {
      kind: 'publish',
      label: 'Version 3',
      command: {
        operationIdentifier: '12345678-1234-1234-1234-123456789012',
        funnelIdentifier: 'workstyle-planner',
        expectedRevision: 2,
        targetVersionIdentifier: '22345678-1234-1234-1234-123456789012',
      },
    };
  },

  rollback(): PublicationIntent {
    return {
      kind: 'rollback',
      label: 'Previous activation',
      command: {
        operationIdentifier: '32345678-1234-1234-1234-123456789012',
        funnelIdentifier: 'workstyle-planner',
        expectedRevision: 3,
      },
    };
  },
} as const;
