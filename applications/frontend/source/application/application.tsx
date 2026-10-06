import { ServiceConnection } from '../service-health/service-connection';

export function Application(): UIElement {
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
        <ServiceConnection />
      </main>
    </div>
  );
}
