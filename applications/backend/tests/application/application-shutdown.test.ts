import { ShutdownFixture } from '../fixtures/shutdown-fixtures.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Diagnostics } from '../../source/diagnostics/diagnostics.js';

describe('HTTP shutdown drain', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('closes remaining connections at the drain deadline', async () => {
    vi.useFakeTimers();
    const { server, shutdown } = ShutdownFixture.create();
    const close = vi.spyOn(server, 'closeAllConnections');
    const diagnostics = vi.spyOn(Diagnostics, 'write').mockImplementation(() => undefined);

    shutdown.beforeApplicationShutdown();
    await vi.advanceTimersByTimeAsync(9_999);
    expect(close).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(close).toHaveBeenCalledOnce();
    expect(diagnostics).toHaveBeenCalledWith({ event: 'shutdown_deadline_exceeded' });
    shutdown.onApplicationShutdown();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('owns only one deadline when shutdown is requested repeatedly', async () => {
    vi.useFakeTimers();
    const { server, shutdown } = ShutdownFixture.create();
    const close = vi.spyOn(server, 'closeAllConnections');

    const diagnostics = vi.spyOn(Diagnostics, 'write').mockImplementation(() => undefined);
    shutdown.beforeApplicationShutdown();
    await vi.advanceTimersByTimeAsync(5_000);
    shutdown.beforeApplicationShutdown();
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(5_000);

    expect(close).toHaveBeenCalledOnce();
    expect(diagnostics).toHaveBeenCalledOnce();
    shutdown.onApplicationShutdown();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the deadline after a successful graceful close', async () => {
    vi.useFakeTimers();
    const { server, shutdown } = ShutdownFixture.create();
    const close = vi.spyOn(server, 'closeAllConnections');

    shutdown.beforeApplicationShutdown();
    shutdown.onApplicationShutdown();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(close).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
