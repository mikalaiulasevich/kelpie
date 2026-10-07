'use client';

import * as React from 'react';
import { ClassNames } from '../styling/combine-class-names';
import { Label as LabelPrimitive } from 'radix-ui';

function Label({ className, ...properties }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={ClassNames.combine(
        'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...properties}
    />
  );
}

export { Label };
