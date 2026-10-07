import { useLocalization } from '../localization/use-localization';
import { ClassNames } from '../styling/combine-class-names';

function Skeleton({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={ClassNames.combine('loading-placeholder rounded-sm', className)}
      {...properties}
    />
  );
}

function SkeletonSummary() {
  return (
    <div aria-hidden="true" className="grid gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-lg border bg-card p-4">
          <Skeleton className="h-3 w-24 max-w-full" />
          <Skeleton className="my-5 h-7 w-20" />
          <Skeleton className="h-2 w-32 max-w-full" />
        </div>
      ))}
    </div>
  );
}

function SkeletonRows({ label = 'Loading records' }: { readonly label?: string }) {
  const { t } = useLocalization();

  return (
    <div role="status" aria-label={t(label)} className="min-w-0 rounded-lg border bg-card p-4">
      <div aria-hidden="true">
        <Skeleton className="mb-5 h-4 w-36 max-w-full" />
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="flex items-center gap-4 border-t py-4">
            <Skeleton className="size-6 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className={row % 2 === 0 ? 'h-3 w-2/5' : 'h-3 w-3/5'} />
              <Skeleton className="h-2 w-1/4" />
            </div>
            <Skeleton className="h-5 w-12 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonChart({ embedded = false }: { readonly embedded?: boolean }) {
  const { t } = useLocalization();

  return (
    <div
      role="status"
      aria-label={t('Loading comparison chart')}
      className={ClassNames.combine('min-w-0 bg-card', !embedded && 'rounded-lg border p-4')}
    >
      <div aria-hidden="true">
        <Skeleton className="h-3 w-36 max-w-full" />
        <div className="mt-6 flex h-40 flex-col justify-around border-b border-l px-5">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
        <div className="mt-3 flex justify-between">
          <Skeleton className="h-2 w-8" />
          <Skeleton className="h-2 w-8" />
          <Skeleton className="h-2 w-8" />
        </div>
      </div>
    </div>
  );
}

export { Skeleton, SkeletonSummary, SkeletonRows, SkeletonChart };
