import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function combineClassNames(...classNames: ClassValue[]): string {
  return twMerge(clsx(classNames));
}
