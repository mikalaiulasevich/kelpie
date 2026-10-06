import { useState } from 'react';
import { Button } from './components/button';
import { useServiceHealth } from './service-health/use-service-health';

export function Application() {
  const [checkSequence, setCheckSequence] = useState(0);
  const serviceHealth = useServiceHealth(checkSequence);
  const statusLabel = {
    checking: 'Checking backend connection',
    ready: 'Backend connection verified',
    unavailable: 'Backend unavailable',
  }[serviceHealth.status];

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5 sm:px-10">
          <span className="font-semibold tracking-tight">Funnel Runtime</span>
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
            Foundation
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-14 sm:px-10 sm:py-20">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Application foundation
        </p>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl sm:leading-tight">
          A foundation for configurable funnels.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-slate-600">
          The frontend connects to the NestJS backend. Funnel sessions, configuration publishing,
          and analytics are not implemented yet.
        </p>
        <section
          aria-labelledby="service-connection-heading"
          className="mt-10 max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <h2 id="service-connection-heading" className="text-lg font-semibold">
            Service connection
          </h2>
          <div role="status" aria-live="polite" aria-atomic="true" className="mt-4">
            <p className="flex items-center gap-3 text-sm font-medium">
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  serviceHealth.status === 'ready'
                    ? 'bg-emerald-600'
                    : serviceHealth.status === 'unavailable'
                      ? 'bg-amber-600'
                      : 'bg-slate-400'
                }`}
              />
              {statusLabel}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {serviceHealth.status === 'ready' && (
                <>
                  Verified at{' '}
                  <time dateTime={serviceHealth.checkedAt.toISOString()}>
                    {serviceHealth.checkedAt.toLocaleTimeString('en-AU')}
                  </time>
                  . This check confirms backend readiness only.
                </>
              )}
              {serviceHealth.status === 'checking' && 'Waiting for a readiness response.'}
              {serviceHealth.status === 'unavailable' &&
                'The readiness check did not succeed. Start the backend and try again.'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-6"
            disabled={serviceHealth.status === 'checking'}
            onClick={() => setCheckSequence((previousSequence) => previousSequence + 1)}
          >
            Check connection
          </Button>
        </section>
      </main>
    </div>
  );
}
