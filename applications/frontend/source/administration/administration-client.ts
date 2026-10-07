import { Ajv } from 'ajv';
import { isNull } from 'es-toolkit/predicate';
import ky, { isTimeoutError } from 'ky';
import { AdministrationMessages } from './administration-messages';
import { AdministrationPolicy, AdministrationRequestPolicy } from './administration-policy';
import {
  AdministrationSchemas,
  type AdministratorCredentials,
  type AdministratorIdentity,
} from './administration-types';

const validateIdentity = new Ajv().compile<AdministratorIdentity>(AdministrationSchemas.Identity);

export class AdministrationError extends Error {}

const AdministrationResponse = {
  requireSuccess(response: Response, credentialsRequest = false): void {
    if (response.ok) {
      return;
    }

    switch (response.status) {
      case 400:
        throw new AdministrationError(
          credentialsRequest
            ? AdministrationMessages.InvalidInput
            : AdministrationMessages.Unavailable,
        );
      case 401:
        throw new AdministrationError(
          credentialsRequest
            ? AdministrationMessages.InvalidCredentials
            : AdministrationMessages.SessionExpired,
        );
      case 429:
        throw new AdministrationError(AdministrationMessages.RateLimited);
      case 403:
        throw new AdministrationError(AdministrationMessages.Forbidden);
      default:
        throw new AdministrationError(AdministrationMessages.Unavailable);
    }
  },

  identity(body: unknown): AdministratorIdentity {
    if (!validateIdentity(body)) {
      throw new AdministrationError(AdministrationMessages.InvalidResponse);
    }

    return body;
  },

  async request<Result>(signal: AbortSignal, operation: () => Promise<Result>): Promise<Result> {
    signal.throwIfAborted();

    try {
      return await operation();
    } catch (error) {
      signal.throwIfAborted();

      if (error instanceof AdministrationError) {
        throw error;
      }

      if (error instanceof SyntaxError) {
        throw new AdministrationError(AdministrationMessages.InvalidResponse, { cause: error });
      }

      if (isTimeoutError(error)) {
        throw new AdministrationError(AdministrationMessages.TimedOut, { cause: error });
      }

      throw new AdministrationError(AdministrationMessages.Unavailable, { cause: error });
    }
  },

  endpoint(path: string): URL {
    return new URL(path, globalThis.location.origin);
  },
} as const;

export const AdministrationClient = {
  session(signal: AbortSignal): Promise<AdministratorIdentity | null> {
    return AdministrationResponse.request(signal, async () => {
      const body = await ky
        .get(AdministrationResponse.endpoint(AdministrationPolicy.SessionEndpoint), {
          ...AdministrationRequestPolicy,
          signal,
          parseJson: (text, { response }) => {
            if (response.status === 401) {
              return null;
            }

            return AdministrationResponse.identity(JSON.parse(text));
          },
          hooks: {
            afterResponse: [
              ({ response }) => {
                if (response.status === 401) {
                  return Response.json(null, { status: 401 });
                }

                AdministrationResponse.requireSuccess(response);
              },
            ],
          },
        })
        .json<unknown>();

      if (isNull(body)) {
        return null;
      }

      return AdministrationResponse.identity(body);
    });
  },

  signIn(
    credentials: AdministratorCredentials,
    signal: AbortSignal,
  ): Promise<AdministratorIdentity> {
    return AdministrationResponse.request(signal, async () => {
      const body = await ky
        .post(AdministrationResponse.endpoint(AdministrationPolicy.SignInEndpoint), {
          ...AdministrationRequestPolicy,
          signal,
          json: credentials,
          headers: {
            [AdministrationPolicy.MutationHeader]: AdministrationPolicy.MutationHeaderValue,
          },
          hooks: {
            afterResponse: [
              ({ response }) => AdministrationResponse.requireSuccess(response, true),
            ],
          },
        })
        .json<unknown>();

      return AdministrationResponse.identity(body);
    });
  },

  signOut(signal: AbortSignal): Promise<void> {
    return AdministrationResponse.request(signal, async () => {
      const response = await ky.post(
        AdministrationResponse.endpoint(AdministrationPolicy.SignOutEndpoint),
        {
          ...AdministrationRequestPolicy,
          signal,
          headers: {
            [AdministrationPolicy.MutationHeader]: AdministrationPolicy.MutationHeaderValue,
          },
        },
      );

      if (response.status === 401) {
        return;
      }

      AdministrationResponse.requireSuccess(response);

      if (response.status !== 204) {
        throw new AdministrationError(AdministrationMessages.InvalidResponse);
      }
    });
  },
} as const;
