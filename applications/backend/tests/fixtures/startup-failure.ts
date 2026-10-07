import { vi } from 'vitest';
import { ApplicationFactory } from '../../source/application/create-application.js';
import { Diagnostics } from '../../source/diagnostics/diagnostics.js';

export const StartupFailureFixture = {
  create(error: unknown) {
    const exitCode = process.exitCode;
    const creation = vi.spyOn(ApplicationFactory, 'create').mockRejectedValueOnce(error);
    const diagnostics = vi.spyOn(Diagnostics, 'write').mockImplementation(() => undefined);
    process.exitCode = 0;

    return {
      creation,
      diagnostics,
      restore(): void {
        process.exitCode = exitCode;
        vi.restoreAllMocks();
      },
    };
  },
} as const;
