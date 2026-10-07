import type { ComponentProps } from 'react';
import { ClassNames } from '../styling/combine-class-names';

export function Kbd({ className, ...properties }: ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={ClassNames.combine(
        'pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground select-none',
        className,
      )}
      {...properties}
    />
  );
}

export function KbdGroup({ className, ...properties }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="kbd-group"
      className={ClassNames.combine('inline-flex items-center gap-1', className)}
      {...properties}
    />
  );
}
