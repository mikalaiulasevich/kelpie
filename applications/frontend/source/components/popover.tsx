import * as React from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { ClassNames } from '../styling/combine-class-names';

function Popover(properties: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...properties} />;
}

function PopoverTrigger(properties: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...properties} />;
}

function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  ...properties
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={ClassNames.combine(
          'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden',
          className,
        )}
        {...properties}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
