export const WarmupMessages = {
  InvalidOrigin:
    'KELPIE_PUBLIC_ORIGIN must be an HTTPS origin without credentials, path, query or fragment.',
  InvalidHealth: 'Readiness response is invalid or exceeds the response limit.',
  HealthCleanupFailed: 'Readiness validation and response cleanup failed.',
  Failed: 'Warmup failed. Check service readiness and deployment logs.',
  Passed: 'Warmup passed: backend readiness, quiz and administration responded.',
  /** @param {string} path */
  invalidResponse(path) {
    return `Warmup target ${path} returned an unexpected status or content type.`;
  },
};
