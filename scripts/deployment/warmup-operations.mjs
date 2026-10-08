import { isPlainObject } from 'es-toolkit';

import { WarmupMessages } from './warmup-messages.mjs';
import { WarmupPolicy } from './warmup-policy.mjs';

/** @typedef {import('./warmup-operations.mjs').WarmupOptions} WarmupOptions */

export const WarmupOperations = {
  /** @param {Optional<string>} value */
  origin(value) {
    try {
      const origin = new URL(value ?? '');

      if (
        origin.protocol !== 'https:' ||
        origin.username ||
        origin.password ||
        origin.pathname !== '/' ||
        origin.search ||
        origin.hash
      ) {
        throw new Error(WarmupMessages.InvalidOrigin);
      }

      return origin.origin;
    } catch {
      throw new Error(WarmupMessages.InvalidOrigin);
    }
  },

  /** @param {Response} response */
  async health(response) {
    const reader = response.body?.getReader();

    if (!reader) {
      throw new Error(WarmupMessages.InvalidHealth);
    }

    let length = 0;
    let text = '';
    const decoder = new TextDecoder();

    try {
      for (;;) {
        const chunk = await reader.read();

        if (chunk.done) {
          break;
        }

        length += chunk.value.byteLength;

        if (length > WarmupPolicy.MaximumHealthBytes) {
          throw new Error(WarmupMessages.InvalidHealth);
        }

        text += decoder.decode(chunk.value, { stream: true });
      }

      text += decoder.decode();
      const health = /** @type {unknown} */ (JSON.parse(text));

      if (!isPlainObject(health) || health.status !== 'ready') {
        throw new Error(WarmupMessages.InvalidHealth);
      }
    } catch (error) {
      try {
        await reader.cancel();
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], WarmupMessages.HealthCleanupFailed, {
          cause: cleanupError,
        });
      }

      throw error;
    } finally {
      reader.releaseLock();
    }
  },

  /**
   * @param {Optional<string>} value
   * @param {WarmupOptions} [options]
   */
  async run(value, options = {}) {
    const origin = WarmupOperations.origin(value);
    const request = options.request ?? fetch;
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      options.timeoutMilliseconds ?? WarmupPolicy.TimeoutMilliseconds,
    );

    try {
      // One deadline covers headers and bodies for the entire run. No session-creating endpoints.
      for (const target of WarmupPolicy.Targets) {
        const response = await request(new URL(target.path, origin), {
          method: 'GET',
          redirect: 'error',
          signal: controller.signal,
          headers: { Accept: target.contentType, 'User-Agent': 'Kelpie-Render-Warmup/1.0' },
        });

        if (
          response.status !== 200 ||
          response.headers.get('content-type')?.split(';')[0]?.trim() !== target.contentType
        ) {
          await response.body?.cancel();
          throw new Error(WarmupMessages.invalidResponse(target.path));
        }

        if (target.health) {
          await WarmupOperations.health(response);
        } else {
          await response.body?.cancel();
        }
      }
    } finally {
      clearTimeout(timer);
    }
  },
};
