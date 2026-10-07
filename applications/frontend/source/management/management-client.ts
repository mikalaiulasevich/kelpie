import { Ajv, type ValidateFunction } from 'ajv';
import ky, { isTimeoutError } from 'ky';
import { isUndefined } from 'es-toolkit/predicate';
import { AdministrationPolicy } from '../administration/administration-policy';
import { ManagementMessages } from './management-messages';
import { ManagementPolicy, ManagementRequestPolicy } from './management-policy';
import {
  ManagementSchemas,
  type ManagementQuery,
  type AnalyticsQuery,
  type ConfigurationList,
  type ConfigurationImportResult,
  type PublicationHistory,
  type PublicationResponse,
  type PublishRequest,
  type RollbackRequest,
  type AnalyticsResponse,
  type ManagementIssue,
  type ManagementErrorBody,
} from './management-types';

const compiler = new Ajv();

const ManagementValidators = {
  configurations: compiler.compile<ConfigurationList>(ManagementSchemas.ConfigurationList),
  importResult: compiler.compile<ConfigurationImportResult>(
    ManagementSchemas.ConfigurationImportResult,
  ),
  history: compiler.compile<PublicationHistory>(ManagementSchemas.PublicationHistory),
  publication: compiler.compile<PublicationResponse>(ManagementSchemas.Publication),
  analytics: compiler.compile<AnalyticsResponse>(ManagementSchemas.AnalyticsResponse),
  issue: compiler.compile<ManagementIssue>(ManagementSchemas.Issue),
  errorBody: compiler.compile<ManagementErrorBody>(ManagementSchemas.ErrorBody),
} as const;

export class ManagementError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly issues: readonly ManagementIssue[] = [],
    readonly uncertain = false,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

const ManagementResponse = {
  message(status: number): string {
    switch (status) {
      case 401:
        return ManagementMessages.SessionExpired;
      case 403:
        return ManagementMessages.Forbidden;
      case 404:
        return ManagementMessages.NotFound;
      case 409:
        return ManagementMessages.Conflict;
      case 400:
      case 422:
        return ManagementMessages.InvalidInput;
      case 413:
        return ManagementMessages.TooLarge;
      case 429:
        return ManagementMessages.RateLimited;
      default:
        return ManagementMessages.Unavailable;
    }
  },

  error(body: unknown, status: number, mutation: boolean): ManagementError {
    const safeBody = ManagementValidators.errorBody(body) ? body : undefined;
    const code =
      ManagementPolicy.ErrorCodes.find((candidate) => candidate === safeBody?.code) ??
      'request_failed';
    const issues =
      status === 422
        ? (safeBody?.issues ?? [])
            .slice(0, ManagementPolicy.MaximumIssues)
            .filter((issue): issue is ManagementIssue => ManagementValidators.issue(issue))
            .map((issue) => ({
              path: issue.path.slice(0, ManagementPolicy.MaximumIssuePathLength),
              message: issue.message.slice(0, ManagementPolicy.MaximumIssueMessageLength),
            }))
        : [];

    return new ManagementError(
      ManagementResponse.message(status),
      status,
      code,
      issues,
      mutation && status >= 500,
    );
  },

  async boundedErrorBody(response: Response, signal: AbortSignal): Promise<unknown> {
    const reader = response.body?.getReader();

    if (!reader) {
      return undefined;
    }

    const cancel = () => {
      void reader.cancel();
    };

    signal.addEventListener('abort', cancel, { once: true });
    const decoder = new TextDecoder();
    let text = '';
    let bytes = 0;

    try {
      while (true) {
        const chunk = await reader.read();

        if (chunk.done) {
          break;
        }

        bytes += chunk.value.byteLength;

        if (bytes > ManagementPolicy.MaximumErrorBodyBytes) {
          return undefined;
        }

        text += decoder.decode(chunk.value, { stream: true });
      }

      text += decoder.decode();

      try {
        return JSON.parse(text);
      } catch {
        return undefined;
      }
    } finally {
      signal.removeEventListener('abort', cancel);
      // Ky clones hook responses; cancelling a tee branch can await the other branch indefinitely.
      void reader.cancel();
      reader.releaseLock();
    }
  },

  query(query: ManagementQuery | AnalyticsQuery): URLSearchParams {
    const parameters = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
      if (!isUndefined(value)) {
        parameters.set(key, String(value));
      }
    }

    return parameters;
  },

  async request<Result>(
    path: string,
    signal: AbortSignal,
    validate: ValidateFunction<Result>,
    query?: ManagementQuery | AnalyticsQuery,
    document?: unknown,
    mutation = false,
  ): Promise<Result> {
    signal.throwIfAborted();

    try {
      const body = await ky(new URL(path, globalThis.location.origin), {
        ...ManagementRequestPolicy,
        signal,
        method: mutation ? 'POST' : 'GET',
        ...(query ? { searchParams: ManagementResponse.query(query) } : {}),
        ...(mutation
          ? {
              json: document,
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

export const ManagementClient = {
  configurations(query: ManagementQuery, signal: AbortSignal): Promise<ConfigurationList> {
    return ManagementResponse.request(
      ManagementPolicy.ConfigurationsEndpoint,
      signal,
      ManagementValidators.configurations,
      query,
    );
  },

  history(query: ManagementQuery, signal: AbortSignal): Promise<PublicationHistory> {
    return ManagementResponse.request(
      ManagementPolicy.PublicationsEndpoint,
      signal,
      ManagementValidators.history,
      query,
    );
  },

  analytics(query: AnalyticsQuery, signal: AbortSignal): Promise<AnalyticsResponse> {
    return ManagementResponse.request(
      ManagementPolicy.AnalyticsEndpoint,
      signal,
      ManagementValidators.analytics,
      query,
    );
  },

  importConfiguration(document: unknown, signal: AbortSignal): Promise<ConfigurationImportResult> {
    return ManagementResponse.request(
      ManagementPolicy.ConfigurationsEndpoint,
      signal,
      ManagementValidators.importResult,
      undefined,
      document,
      true,
    );
  },

  publish(command: PublishRequest, signal: AbortSignal): Promise<PublicationResponse> {
    return ManagementResponse.request(
      ManagementPolicy.PublicationsEndpoint,
      signal,
      ManagementValidators.publication,
      undefined,
      command,
      true,
    );
  },

  rollback(command: RollbackRequest, signal: AbortSignal): Promise<PublicationResponse> {
    return ManagementResponse.request(
      ManagementPolicy.RollbacksEndpoint,
      signal,
      ManagementValidators.publication,
      undefined,
      command,
      true,
    );
  },
} as const;
