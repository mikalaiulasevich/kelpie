import { cva } from 'class-variance-authority';

export const BadgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-border px-1.5 py-0.5 text-xs leading-4 font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'text-foreground [a&]:hover:bg-accent',
        success: 'border-success/25 text-success',
        warning: 'border-warning/25 text-warning',
        info: 'border-info/25 text-info',
        secondary: 'text-muted-foreground [a&]:hover:bg-accent',
        destructive:
          'border-destructive/25 text-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/10',
        outline:
          'border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        ghost: 'border-transparent [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        link: 'border-transparent text-primary underline-offset-4 [a&]:hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);
