import { ConfigurationImportError } from '../../source/configurations/configuration-import-error.js';
import { ConfigurationImportErrorCode } from '../../source/configurations/configuration-import-types.js';

export const ConfigurationCommandErrors = {
  revoked(): unknown {
    const proxy = Proxy.revocable({}, {});
    proxy.revoke();

    return proxy.proxy;
  },

  unreadable(property: 'code' | 'issues'): ConfigurationImportError {
    const error = new ConfigurationImportError(ConfigurationImportErrorCode.Conflict);
    error.message = 'private input';
    Object.defineProperty(error, property, {
      get: () => {
        throw new Error('private accessor');
      },
    });

    return error;
  },
} as const;
