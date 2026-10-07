import { ToggleVariants } from './toggle-styles';
import * as React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { ClassNames } from '../styling/combine-class-names';
import { Toggle as TogglePrimitive } from 'radix-ui';

function Toggle({
  className,
  variant,
  size,
  ...properties
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof ToggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={ClassNames.combine(ToggleVariants({ variant, size, className }))}
      {...properties}
    />
  );
}

export { Toggle };
