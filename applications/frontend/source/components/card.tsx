import * as React from 'react';
import { ClassNames } from '../styling/combine-class-names';

function Card({ className, children, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={ClassNames.combine(
        'surface-shell flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground',
        className,
      )}
      {...properties}
    >
      <div className="surface-core">{children}</div>
    </div>
  );
}

function CardHeader({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={ClassNames.combine(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className,
      )}
      {...properties}
    />
  );
}

function CardTitle({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={ClassNames.combine('text-base leading-snug font-semibold', className)}
      {...properties}
    />
  );
}

function CardDescription({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={ClassNames.combine('text-sm text-muted-foreground', className)}
      {...properties}
    />
  );
}

function CardAction({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={ClassNames.combine(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...properties}
    />
  );
}

function CardContent({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={ClassNames.combine('px-6', className)}
      {...properties}
    />
  );
}

function CardFooter({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={ClassNames.combine('flex items-center px-6 [.border-t]:pt-6', className)}
      {...properties}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
