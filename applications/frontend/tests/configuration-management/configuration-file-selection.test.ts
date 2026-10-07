import { describe, expect, it } from 'vitest';
import { ConfigurationFileSelectionFixtures } from '../fixtures/configuration-file-selection-fixtures';

describe('configuration file selection lifecycle', () => {
  it('clears the reading state when an empty selection replaces an unfinished read', async () => {
    const { selection, callbacks } = ConfigurationFileSelectionFixtures.create();
    const { file, completion } = ConfigurationFileSelectionFixtures.deferredFile();
    const pending = selection.select(file);
    expect(callbacks.setReading).toHaveBeenLastCalledWith(true);

    await selection.select(undefined);
    expect(callbacks.setReading).toHaveBeenLastCalledWith(false);
    completion.resolve('{"stale":true}');
    await pending;

    expect(callbacks.reset).toHaveBeenCalledTimes(2);
    expect(callbacks.accept).not.toHaveBeenCalled();
    expect(callbacks.setMessage).not.toHaveBeenCalled();
    expect(callbacks.setReading.mock.calls).toEqual([[false], [true], [false]]);
  });

  it('clears reading for an oversized replacement and retains its error after a stale failure', async () => {
    const { selection, callbacks } = ConfigurationFileSelectionFixtures.create();
    const { file, completion } = ConfigurationFileSelectionFixtures.deferredFile();
    const pending = selection.select(file);

    await selection.select(new File([new Uint8Array(262_145)], 'too-large.json'));
    expect(callbacks.setReading).toHaveBeenLastCalledWith(false);
    expect(callbacks.setMessage).toHaveBeenCalledTimes(1);
    expect(callbacks.setMessage).toHaveBeenLastCalledWith(
      'The file is larger than the 256 KiB request limit.',
    );
    completion.reject(new Error('Old file read failed'));
    await pending;

    expect(callbacks.accept).not.toHaveBeenCalled();
    expect(callbacks.setMessage).toHaveBeenCalledTimes(1);
    expect(callbacks.setReading.mock.calls).toEqual([[false], [true], [false]]);
  });

  it('keeps the replacement busy until its own completion and accepts only its document', async () => {
    const { selection, callbacks } = ConfigurationFileSelectionFixtures.create();
    const first = ConfigurationFileSelectionFixtures.deferredFile('first.json');
    const second = ConfigurationFileSelectionFixtures.deferredFile('second.json');
    const firstPending = selection.select(first.file);
    const secondPending = selection.select(second.file);

    first.completion.resolve('{"stale":true}');
    await firstPending;
    expect(callbacks.setReading).toHaveBeenLastCalledWith(true);
    expect(callbacks.accept).not.toHaveBeenCalled();
    second.completion.resolve('{"current":true}');
    await secondPending;

    expect(callbacks.accept).toHaveBeenCalledExactlyOnceWith({ current: true }, second.file);
    expect(callbacks.setReading).toHaveBeenLastCalledWith(false);
  });

  it('does not deliver any completion callbacks after unmount cancellation', async () => {
    const { selection, callbacks } = ConfigurationFileSelectionFixtures.create();
    const { file, completion } = ConfigurationFileSelectionFixtures.deferredFile();
    const pending = selection.select(file);

    selection.cancel();
    completion.resolve('{"stale":true}');
    await pending;

    expect(callbacks.accept).not.toHaveBeenCalled();
    expect(callbacks.setMessage).not.toHaveBeenCalled();
    expect(callbacks.setReading.mock.calls).toEqual([[false], [true]]);
  });

  it('settles malformed JSON and permits a subsequent valid selection', async () => {
    const { selection, callbacks } = ConfigurationFileSelectionFixtures.create();
    await selection.select(new File(['{'], 'invalid.json'));

    expect(callbacks.setMessage).toHaveBeenCalledTimes(1);
    expect(callbacks.accept).not.toHaveBeenCalled();
    expect(callbacks.setReading).toHaveBeenLastCalledWith(false);
    expect(callbacks.setMessage).toHaveBeenLastCalledWith(
      'Choose a valid JSON configuration file.',
    );

    const valid = new File(['{"valid":true}'], 'valid.json');
    await selection.select(valid);

    expect(callbacks.reset).toHaveBeenCalledTimes(2);
    expect(callbacks.accept).toHaveBeenCalledExactlyOnceWith({ valid: true }, valid);
    expect(callbacks.setReading).toHaveBeenLastCalledWith(false);
  });

  it('settles a failed current file read without accepting a document', async () => {
    const { selection, callbacks } = ConfigurationFileSelectionFixtures.create();
    const { file, completion } = ConfigurationFileSelectionFixtures.deferredFile();
    const pending = selection.select(file);

    completion.reject(new Error('The browser could not read the file'));
    await pending;

    expect(callbacks.accept).not.toHaveBeenCalled();
    expect(callbacks.setMessage).toHaveBeenCalledExactlyOnceWith(
      'Choose a valid JSON configuration file.',
    );
    expect(callbacks.setReading).toHaveBeenLastCalledWith(false);
  });

  it('allows new selections after cleanup, including React strict effect replay', async () => {
    const { selection, callbacks } = ConfigurationFileSelectionFixtures.create();
    selection.cancel();
    const file = new File(['{}'], 'configuration.json');

    await selection.select(file);

    expect(callbacks.accept).toHaveBeenCalledExactlyOnceWith({}, file);
    expect(callbacks.setReading).toHaveBeenLastCalledWith(false);
  });
});
