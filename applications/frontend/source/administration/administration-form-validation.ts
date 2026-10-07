import { AdministrationFormMessages } from './administration-content';
import type { AdministratorCredentials, AdministrationFormErrors } from './administration-types';

export const AdministrationFormValidation = {
  errors(credentials: AdministratorCredentials): AdministrationFormErrors {
    return {
      ...(!credentials.username.trim()
        ? { username: AdministrationFormMessages.UsernameRequired }
        : {}),
      ...(!credentials.password ? { password: AdministrationFormMessages.PasswordRequired } : {}),
    };
  },
} as const;
