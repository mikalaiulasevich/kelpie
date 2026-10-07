import assert from 'node:assert/strict';
import { beforeEach, describe, expect, it } from 'vitest';
import { PublicationExecution } from '../../source/configuration-management/publication-execution';
import { PublicationIntents } from '../../source/configuration-management/publication-intents';
import { PublicationIntentFixture } from '../fixtures/publication-intent-fixtures';
import { ManagementClientFixture } from '../fixtures/management-client-fixtures';

beforeEach(ManagementClientFixture.browser);

describe('publication execution and recovery cleanup', () => {
  it('returns confirmed cleanup after sending and clearing the original operation', async () => {
    PublicationIntentFixture.storage();
    const intent = PublicationIntentFixture.publish();
    const { fetch, requestBodies } = ManagementClientFixture.mutationResponse(
      ManagementClientFixture.publication(),
    );

    await expect(
      PublicationExecution.apply('administrator-1', intent, new AbortController().signal),
    ).resolves.toBe(true);
    expect(await requestBodies[0]).toEqual(intent.command);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(PublicationIntents.read('administrator-1')).toBeUndefined();
  });

  it('keeps a confirmed mutation successful when storage cleanup fails', async () => {
    const { storage } = PublicationIntentFixture.storage();
    const intent = PublicationIntentFixture.publish();
    storage.removeItem.mockImplementation(() => {
      throw new DOMException('Storage became blocked', 'SecurityError');
    });
    const { fetch, requestBodies } = ManagementClientFixture.mutationResponse(
      ManagementClientFixture.publication(),
    );

    await expect(
      PublicationExecution.apply('administrator-1', intent, new AbortController().signal),
    ).resolves.toBe(false);
    expect(await requestBodies[0]).toEqual(intent.command);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(PublicationIntents.read('administrator-1')).toEqual(intent);
  });

  it('does not send a mutation when preserving its operation fails', async () => {
    const { storage } = PublicationIntentFixture.storage();
    storage.setItem.mockImplementation(() => {
      throw new DOMException('Storage is blocked', 'SecurityError');
    });
    const { fetch } = ManagementClientFixture.mutationResponse(
      ManagementClientFixture.publication(),
    );

    await expect(
      PublicationExecution.apply(
        'administrator-1',
        PublicationIntentFixture.publish(),
        new AbortController().signal,
      ),
    ).rejects.toThrow('No change was sent.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('retains an uncertain operation and retries its exact original body', async () => {
    PublicationIntentFixture.storage();
    const intent = PublicationIntentFixture.publish();
    const failedFetch = ManagementClientFixture.networkFailure();

    await expect(
      PublicationExecution.apply('administrator-1', intent, new AbortController().signal),
    ).rejects.toMatchObject({ uncertain: true });
    expect(failedFetch).toHaveBeenCalledTimes(1);
    const restored = PublicationIntents.read('administrator-1');
    expect(restored).toEqual(intent);
    assert.ok(restored);
    const { fetch, requestBodies } = ManagementClientFixture.mutationResponse(
      ManagementClientFixture.publication(),
    );

    await PublicationExecution.apply('administrator-1', restored, new AbortController().signal);
    expect(await requestBodies[0]).toEqual(intent.command);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(PublicationIntents.read('administrator-1')).toBeUndefined();
  });

  it('does not persist or send a command after cancellation', async () => {
    const { storage } = PublicationIntentFixture.storage();
    const { fetch } = ManagementClientFixture.mutationResponse(
      ManagementClientFixture.publication(),
    );
    const cancellation = new AbortController();
    cancellation.abort();

    await expect(
      PublicationExecution.apply(
        'administrator-1',
        PublicationIntentFixture.publish(),
        cancellation.signal,
      ),
    ).rejects.toBe(cancellation.signal.reason);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
