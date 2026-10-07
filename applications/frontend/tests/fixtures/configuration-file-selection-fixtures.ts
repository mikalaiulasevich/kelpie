import { vi } from 'vitest';
import { ManagementReadFixture } from './management-read-fixtures';
import { ConfigurationFileSelection } from '../../source/configuration-management/configuration-file-selection';

export const ConfigurationFileSelectionFixtures = {
  create() {
    const callbacks = {
      reset: vi.fn<() => void>(),
      setReading: vi.fn<(reading: boolean) => void>(),
      setMessage: vi.fn<(message: string) => void>(),
      accept: vi.fn<(document: unknown, file: File) => void>(),
    };

    return { callbacks, selection: new ConfigurationFileSelection(callbacks) };
  },

  deferredFile(name = 'configuration.json') {
    const completion = ManagementReadFixture.deferred();
    const file = new File(['{}'], name, { type: 'application/json' });
    vi.spyOn(file, 'text').mockReturnValue(completion.promise);

    return { file, completion };
  },
};
