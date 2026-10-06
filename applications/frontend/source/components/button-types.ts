import type { ButtonHTMLAttributes } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { ButtonStyles } from './button-styles';

export interface ButtonProperties
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof ButtonStyles.variants> {
  readonly asChild?: boolean;
}
