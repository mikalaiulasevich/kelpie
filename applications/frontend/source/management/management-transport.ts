import ky, { isTimeoutError } from 'ky';
import { isUndefined } from 'es-toolkit/predicate';
import { AdministrationPolicy } from '../administration/administration-policy';
import { ManagementError } from './management-error';
import { ManagementMessages } from './management-messages';
import { ManagementRequestPolicy } from './management-policy';
import { ManagementResponse } from './management-response';
import type { ManagementRequest } from './management-request';
import type { ManagementQuery, AnalyticsQuery } from './management-types';

export const ManagementTransport = {
  query(query: ManagementQuery | AnalyticsQuery): URLSearchParams {
    const parameters = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
      if (!isUndefined(value)) {
        parameters.set(key, String(value));
      }
    }

    return parameters;
  },

  async request<Result>(request: ManagementRequest<Result>): Promise<Result> {
    const { path, signal, validate } = request;
    const mutation = request.method === 'POST';
    signal.throwIfAborted();

    try {
      const body = await ky(new URL(path, globalThis.location.origin), {
        ...ManagementRequestPolicy,
        signal,
        method: request.method,
        ...(request.method === 'GET' && request.query
          ? { searchParams: ManagementTransport.query(request.query) }
          : {}),
        ...(request.method === 'POST'
          ? {
              json: request.document,
              headers: {
                [AdministrationPolicy.MutationHeader]: AdministrationPolicy.MutationHeaderValue,
              },
            }
          : {}),
        hooks: {
          afterResponse: [
            async ({ response, request }) => {
              if (!response.ok) {
                throw ManagementResponse.error(
                  await ManagementResponse.boundedErrorBody(response, request.signal),
                  response.status,
                  mutation,
                );
              }
            },
          ],
        },
      }).json<unknown>();

      if (!validate(body)) {
        throw new ManagementError(
          ManagementMessages.InvalidResponse,
          200,
          'invalid_response',
          [],
          mutation,
        );
      }

      return body;
    } catch (error) {
      signal.throwIfAborted();

      if (error instanceof ManagementError) {
        throw error;
      }

      if (error instanceof SyntaxError) {
        throw new ManagementError(
          ManagementMessages.InvalidResponse,
          200,
          'invalid_response',
          [],
          mutation,
          { cause: error },
        );
      }

      if (isTimeoutError(error)) {
        throw new ManagementError(ManagementMessages.TimedOut, 0, 'timeout', [], mutation, {
          cause: error,
        });
      }

      throw new ManagementError(ManagementMessages.Unavailable, 0, 'network', [], mutation, {
        cause: error,
      });
    }
  },
} as const;
