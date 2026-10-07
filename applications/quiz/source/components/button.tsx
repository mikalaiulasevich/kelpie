// Adapted from shadcn/ui Button (MIT); styling belongs to the quiz application.
import { Slot } from '@radix-ui/react-slot';
import type { ComponentProps } from 'react';
import { clsx } from 'clsx';

interface ButtonProperties extends ComponentProps<'button'> {
  readonly appearance?: 'primary' | 'secondary' | 'quiet';
  readonly asChild?: boolean;
}

export function Button({
  appearance = 'primary',
  className,
  asChild = false,
  ...properties
}: ButtonProperties) {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      className={clsx('quiz-button', `quiz-button-${appearance}`, className)}
      {...properties}
    />
  );
}
