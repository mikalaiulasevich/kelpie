import { cva, type VariantProps } from 'class-variance-authority';
import { ClassNames } from '../styling/combine-class-names';

function Empty({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty"
      className={ClassNames.combine(
        'flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border-dashed p-6 text-center text-balance md:p-12',
        className,
      )}
      {...properties}
    />
  );
}

function EmptyHeader({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-header"
      className={ClassNames.combine(
        'flex max-w-sm flex-col items-center gap-2 text-center',
        className,
      )}
      {...properties}
    />
  );
}

const emptyMediaVariants = cva(
  'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: "flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-muted text-foreground [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function EmptyMedia({
  className,
  variant = 'default',
  ...properties
}: React.ComponentProps<'div'> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={ClassNames.combine(emptyMediaVariants({ variant, className }))}
      {...properties}
    />
  );
}

function EmptyTitle({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-title"
      className={ClassNames.combine('text-lg font-medium tracking-tight', className)}
      {...properties}
    />
  );
}

function EmptyDescription({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-description"
      className={ClassNames.combine(
        'text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        className,
      )}
      {...properties}
    />
  );
}

function EmptyContent({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-content"
      className={ClassNames.combine(
        'flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance',
        className,
      )}
      {...properties}
    />
  );
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia };
