import type { Options } from 'ky';

export const AdministrationPolicy = {
  SessionEndpoint: '/api/administration/session',
  SignInEndpoint: '/api/administration/sign-in',
  SignOutEndpoint: '/api/administration/sign-out',
  MutationHeader: 'X-Kelpie-Administration',
  MutationHeaderValue: '1',
  RequestTimeoutMilliseconds: 10_000,
} as const;

export const AdministrationRequestPolicy = {
  retry: 0,
  timeout: AdministrationPolicy.RequestTimeoutMilliseconds,
  totalTimeout: AdministrationPolicy.RequestTimeoutMilliseconds,
  credentials: 'same-origin',
  cache: 'no-store',
  throwHttpErrors: false,
} as const satisfies Options;
