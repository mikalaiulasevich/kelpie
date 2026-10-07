import { BadgeVariants } from './badge-styles';
import * as React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { ClassNames } from '../styling/combine-class-names';
import { Slot } from 'radix-ui';

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...properties
}: React.ComponentProps<'span'> & VariantProps<typeof BadgeVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot.Root : 'span';

  return (
    <Component
      data-slot="badge"
      data-variant={variant}
      className={ClassNames.combine(BadgeVariants({ variant }), className)}
      {...properties}
    />
  );
}

export { Badge };
