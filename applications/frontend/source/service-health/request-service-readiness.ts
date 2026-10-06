const requestTimeoutMilliseconds = 5_000;

export async function requestServiceReadiness(cancellationSignal: AbortSignal): Promise<void> {
  const timeoutController = new AbortController();
  const timeoutIdentifier = setTimeout(() => {
    timeoutController.abort(new Error('The service readiness check timed out.'));
  }, requestTimeoutMilliseconds);

  try {
    const response = await fetch('/api/health/ready', {
      signal: AbortSignal.any([cancellationSignal, timeoutController.signal]),
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error('The backend is not ready.');
    }

    const responseBody: unknown = await response.json();
    if (
      typeof responseBody !== 'object' ||
      responseBody === null ||
      !('status' in responseBody) ||
      responseBody.status !== 'ready'
    ) {
      throw new Error('The service returned an invalid readiness response.');
    }
  } finally {
    clearTimeout(timeoutIdentifier);
  }
}
