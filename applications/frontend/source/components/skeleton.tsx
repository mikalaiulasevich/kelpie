import { ClassNames } from '../styling/combine-class-names';

function Skeleton({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={ClassNames.combine('animate-pulse rounded-md bg-accent', className)}
      {...properties}
    />
  );
}

export { Skeleton };
