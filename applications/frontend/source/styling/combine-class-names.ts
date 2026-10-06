import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const ClassNames = {
  combine(...classNames: ClassValue[]): string {
    return twMerge(clsx(classNames));
  },
} as const;
