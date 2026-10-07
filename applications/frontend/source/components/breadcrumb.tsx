import { useLocalization } from '../localization/use-localization';
import * as React from 'react';
import { ClassNames } from '../styling/combine-class-names';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { Slot } from 'radix-ui';

function Breadcrumb({ ...properties }: React.ComponentProps<'nav'>) {
  const { t } = useLocalization();

  return <nav aria-label={t('breadcrumb')} data-slot="breadcrumb" {...properties} />;
}

function BreadcrumbList({ className, ...properties }: React.ComponentProps<'ol'>) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={ClassNames.combine(
        'flex flex-wrap items-center gap-1.5 text-sm break-words text-muted-foreground sm:gap-2.5',
        className,
      )}
      {...properties}
    />
  );
}

function BreadcrumbItem({ className, ...properties }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={ClassNames.combine('inline-flex items-center gap-1.5', className)}
      {...properties}
    />
  );
}

function BreadcrumbLink({
  asChild,
  className,
  ...properties
}: React.ComponentProps<'a'> & {
  asChild?: boolean;
}) {
  const Component = asChild ? Slot.Root : 'a';

  return (
    <Component
      data-slot="breadcrumb-link"
      className={ClassNames.combine('transition-colors hover:text-foreground', className)}
      {...properties}
    />
  );
}

function BreadcrumbPage({ className, ...properties }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={ClassNames.combine('font-normal text-foreground', className)}
      {...properties}
    />
  );
}

function BreadcrumbSeparator({ children, className, ...properties }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={ClassNames.combine('[&>svg]:size-3.5', className)}
      {...properties}
    >
      {children ?? <ChevronRight />}
    </li>
  );
}

function BreadcrumbEllipsis({ className, ...properties }: React.ComponentProps<'span'>) {
  const { t } = useLocalization();

  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={ClassNames.combine('flex size-9 items-center justify-center', className)}
      {...properties}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">{t('More')}</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
