import { TabsListVariants } from './tabs-styles';
import * as React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { ClassNames } from '../styling/combine-class-names';
import { Tabs as TabsPrimitive } from 'radix-ui';

function Tabs({
  className,
  orientation = 'horizontal',
  style,
  onMouseDownCapture,
  onKeyDownCapture,
  onFocusCapture,
  ...properties
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const [reservedHeight, setReservedHeight] = React.useState(0);

  React.useEffect(() => {
    const resetHeight = () => setReservedHeight(0);

    window.addEventListener('resize', resetHeight);

    return () => window.removeEventListener('resize', resetHeight);
  }, []);

  const reserveHeight = (event: React.SyntheticEvent<HTMLDivElement>) => {
    const target = event.target;

    if (
      target instanceof Element &&
      target.closest('[role="tab"]')?.closest('[data-slot="tabs"]') === event.currentTarget
    ) {
      // Capture before Radix replaces panels. A shorter document would clamp
      // the browser scroll, including during Presence layout effects.
      const remainingScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight - window.scrollY,
      );
      const height = Math.max(0, event.currentTarget.offsetHeight - remainingScroll);

      // Reserve only the space needed by the current viewport, not a whole long table.
      setReservedHeight(Math.ceil(height));
    }
  };

  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      style={{ minHeight: reservedHeight || undefined, ...style }}
      onMouseDownCapture={(event) => {
        reserveHeight(event);
        onMouseDownCapture?.(event);
      }}
      onKeyDownCapture={(event) => {
        reserveHeight(event);
        onKeyDownCapture?.(event);
      }}
      onFocusCapture={(event) => {
        reserveHeight(event);
        onFocusCapture?.(event);
      }}
      className={ClassNames.combine(
        'group/tabs flex gap-2 data-[orientation=horizontal]:flex-col',
        className,
      )}
      {...properties}
    />
  );
}

function TabsList({
  className,
  variant = 'default',
  ...properties
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof TabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={ClassNames.combine(TabsListVariants({ variant }), className)}
      {...properties}
    />
  );
}

function TabsTrigger({
  className,
  ...properties
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={ClassNames.combine(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-none group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        'group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent',
        'data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground',
        'after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100',
        className,
      )}
      {...properties}
    />
  );
}

function TabsContent({
  className,
  ...properties
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={ClassNames.combine('flex-1 outline-none', className)}
      {...properties}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
