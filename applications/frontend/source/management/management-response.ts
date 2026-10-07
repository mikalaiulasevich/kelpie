import { ManagementError } from './management-error';
import { ManagementMessages } from './management-messages';
import { ManagementPolicy } from './management-policy';
import { ManagementValidators } from './management-validators';
import type { ManagementIssue } from './management-types';

export const ManagementResponse = {
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

  cancelErrorBody(reader: ReadableStreamDefaultReader<Uint8Array>): void {
    // Cancellation can reject after a disconnect; cleanup must not replace the request failure.
    void reader.cancel().catch(() => undefined);
  },

  async boundedErrorBody(response: Response, signal: AbortSignal): Promise<unknown> {
    const reader = response.body?.getReader();

    if (!reader) {
      return undefined;
    }

    const cancel = () => {
      ManagementResponse.cancelErrorBody(reader);
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
      ManagementResponse.cancelErrorBody(reader);
      reader.releaseLock();
    }
  },
} as const;
