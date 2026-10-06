// Adapted from the official shadcn/ui New York button registry (MIT):
// https://ui.shadcn.com/r/styles/new-york/button.json
import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { ButtonStyles } from './button-styles';
import type { ButtonProperties } from './button-types';
import { ClassNames } from '../styling/combine-class-names';

export const Button = forwardRef<HTMLButtonElement, ButtonProperties>(
  ({ className, variant, size, asChild = false, ...properties }, reference) => {
    const Component = asChild ? Slot : 'button';

    return (
      <Component
        className={ClassNames.combine(ButtonStyles.variants({ variant, size, className }))}
        ref={reference}
        {...properties}
      />
    );
  },
);
Button.displayName = 'Button';
