import * as ChildProcesses from 'node:child_process';
import * as FileSystem from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StartupProcessFixture } from '../fixtures/startup-process.js';

vi.mock('node:fs/promises', () => ({
  mkdtemp: vi.fn().mockResolvedValue('/temporary-startup-fixture'),
  rm: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  spawn: vi.fn(),
}));

describe('Startup process fixture failure preservation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('removes the temporary directory and preserves a synchronous spawn failure', async () => {
    const setupError = new Error('Spawn failed.');
    vi.mocked(ChildProcesses.spawn).mockImplementationOnce(() => {
      throw setupError;
    });

    await expect(StartupProcessFixture.create({})).rejects.toBe(setupError);
    expect(FileSystem.rm).toHaveBeenCalledWith('/temporary-startup-fixture', {
      recursive: true,
      force: true,
    });
  });

  it('preserves both spawn and directory cleanup failures', async () => {
    const setupError = new Error('Spawn failed.');
    const cleanupError = new Error('Directory cleanup failed.');
    vi.mocked(ChildProcesses.spawn).mockImplementationOnce(() => {
      throw setupError;
    });
    vi.mocked(FileSystem.rm).mockRejectedValueOnce(cleanupError);

    await expect(StartupProcessFixture.create({})).rejects.toMatchObject({
      name: 'AggregateError',
      errors: [setupError, cleanupError],
      cause: setupError,
    });
  });

  it('preserves both child process and directory cleanup failures on close', async () => {
    const process = new ChildProcesses.ChildProcess();
    const exitError = new Error('Child process failed.');
    const cleanupError = new Error('Directory cleanup failed.');
    vi.mocked(ChildProcesses.spawn).mockReturnValueOnce(process);
    const fixture = await StartupProcessFixture.create({});
    vi.spyOn(process, 'kill').mockImplementationOnce(() => {
      process.emit('error', exitError);

      return true;
    });
    vi.mocked(FileSystem.rm).mockRejectedValueOnce(cleanupError);

    await expect(fixture.close()).rejects.toMatchObject({
      name: 'AggregateError',
      errors: [exitError, cleanupError],
      cause: exitError,
    });
  });
});
