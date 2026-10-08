import { SidebarStyles } from './sidebar-styles';
import { useLocalization } from '../localization/use-localization';
import { isString } from 'es-toolkit';
import { useSidebar } from '../navigation/use-sidebar';
import { SidebarContext } from '../navigation/sidebar-context';
import { SidebarPolicy } from '../navigation/sidebar-policy';
import * as React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { ClassNames } from '../styling/combine-class-names';
import { PanelLeftIcon } from 'lucide-react';
import { Slot } from 'radix-ui';

import { useSidebarState } from '../navigation/use-sidebar-state';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Separator } from '@/components/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/sheet';
import { Skeleton } from '@/components/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/tooltip';

interface SidebarStyle extends React.CSSProperties {
  '--sidebar-width'?: string;
  '--sidebar-width-icon'?: string;
  '--skeleton-width'?: string;
}

function SidebarProvider({
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  className,
  style,
  children,
  ...properties
}: React.ComponentProps<'div'> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const contextValue = useSidebarState({ defaultOpen, open: controlledOpen, onOpenChange });

  const providerStyle: SidebarStyle = {
    '--sidebar-width': SidebarPolicy.Width,
    '--sidebar-width-icon': SidebarPolicy.IconWidth,
    ...style,
  };

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="sidebar-wrapper"
          style={providerStyle}
          className={ClassNames.combine(
            'group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar',
            className,
          )}
          {...properties}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  side = 'left',
  variant = 'sidebar',
  collapsible = 'offcanvas',
  className,
  children,
  ...properties
}: React.ComponentProps<'div'> & {
  side?: 'left' | 'right';
  variant?: 'sidebar' | 'floating' | 'inset';
  collapsible?: 'offcanvas' | 'icon' | 'none';
}) {
  const { t } = useLocalization();

  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === 'none') {
    return (
      <div
        data-slot="sidebar"
        className={ClassNames.combine(
          'flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground',
          className,
        )}
        {...properties}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    const mobileStyle: SidebarStyle = { '--sidebar-width': SidebarPolicy.MobileWidth };

    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...properties}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className="w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
          style={mobileStyle}
          side={side}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{t('Sidebar')}</SheetTitle>
            <SheetDescription>{t('Displays the mobile sidebar.')}</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="group peer hidden text-sidebar-foreground md:block"
      data-state={state}
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      {/* This is what handles the sidebar gap on desktop */}
      <div
        data-slot="sidebar-gap"
        className={ClassNames.combine(
          'relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear',
          'group-data-[collapsible=offcanvas]:w-0',
          'group-data-[side=right]:rotate-180',
          variant === 'floating' || variant === 'inset'
            ? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]'
            : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
        )}
      />
      <div
        data-slot="sidebar-container"
        className={ClassNames.combine(
          'fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex',
          side === 'left'
            ? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
            : 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
          // Adjust the padding for floating and inset variants.
          variant === 'floating' || variant === 'inset'
            ? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
            : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l',
          className,
        )}
        {...properties}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow-sm"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarTrigger({
  className,
  onClick,
  ...properties
}: React.ComponentProps<typeof Button>) {
  const { t } = useLocalization();

  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={ClassNames.combine('size-7', className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...properties}
    >
      <PanelLeftIcon />
      <span className="sr-only">{t('Toggle Sidebar')}</span>
    </Button>
  );
}

function SidebarRail({ className, ...properties }: React.ComponentProps<'button'>) {
  const { t } = useLocalization();

  const { toggleSidebar } = useSidebar();

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label={t('Toggle Sidebar')}
      tabIndex={-1}
      onClick={toggleSidebar}
      title={t('Toggle Sidebar')}
      className={ClassNames.combine(
        'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex',
        'in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize',
        '[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
        'group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar',
        '[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
        '[[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
        className,
      )}
      {...properties}
    />
  );
}

function SidebarInset({ className, ...properties }: React.ComponentProps<'main'>) {
  return (
    <main
      data-slot="sidebar-inset"
      className={ClassNames.combine(
        'relative flex w-full flex-1 flex-col bg-background',
        'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2',
        className,
      )}
      {...properties}
    />
  );
}

function SidebarInput({ className, ...properties }: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={ClassNames.combine('h-8 w-full bg-background shadow-none', className)}
      {...properties}
    />
  );
}

function SidebarHeader({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={ClassNames.combine('flex flex-col gap-2 p-2', className)}
      {...properties}
    />
  );
}

function SidebarFooter({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={ClassNames.combine('flex flex-col gap-2 p-2', className)}
      {...properties}
    />
  );
}

function SidebarSeparator({ className, ...properties }: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={ClassNames.combine('mx-2 w-auto bg-sidebar-border', className)}
      {...properties}
    />
  );
}

function SidebarContent({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={ClassNames.combine(
        'flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
        className,
      )}
      {...properties}
    />
  );
}

function SidebarGroup({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={ClassNames.combine('relative flex w-full min-w-0 flex-col p-2', className)}
      {...properties}
    />
  );
}

function SidebarGroupLabel({
  className,
  asChild = false,
  ...properties
}: React.ComponentProps<'div'> & { asChild?: boolean }) {
  const Component = asChild ? Slot.Root : 'div';

  return (
    <Component
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={ClassNames.combine(
        'flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
        'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0',
        className,
      )}
      {...properties}
    />
  );
}

function SidebarGroupAction({
  className,
  asChild = false,
  ...properties
}: React.ComponentProps<'button'> & { asChild?: boolean }) {
  const Component = asChild ? Slot.Root : 'button';

  return (
    <Component
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      className={ClassNames.combine(
        'absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
        // Increases the hit area of the button on mobile.
        'after:absolute after:-inset-2 md:after:hidden',
        'group-data-[collapsible=icon]:hidden',
        className,
      )}
      {...properties}
    />
  );
}

function SidebarGroupContent({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={ClassNames.combine('w-full text-sm', className)}
      {...properties}
    />
  );
}

function SidebarMenu({ className, ...properties }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={ClassNames.combine('flex w-full min-w-0 flex-col gap-1', className)}
      {...properties}
    />
  );
}

function SidebarMenuItem({ className, ...properties }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={ClassNames.combine('group/menu-item relative', className)}
      {...properties}
    />
  );
}

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = 'default',
  size = 'default',
  tooltip,
  className,
  ...properties
}: React.ComponentProps<'button'> & {
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string | React.ComponentProps<typeof TooltipContent>;
} & VariantProps<typeof SidebarStyles.variants>) {
  const Component = asChild ? Slot.Root : 'button';
  const { isMobile, state } = useSidebar();

  const button = (
    <Component
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={ClassNames.combine(SidebarStyles.variants({ variant, size }), className)}
      {...properties}
    />
  );

  if (!tooltip) {
    return button;
  }

  const tooltipProperties = isString(tooltip) ? { children: tooltip } : tooltip;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== 'collapsed' || isMobile}
        {...tooltipProperties}
      />
    </Tooltip>
  );
}

function SidebarMenuAction({
  className,
  asChild = false,
  showOnHover = false,
  ...properties
}: React.ComponentProps<'button'> & {
  asChild?: boolean;
  showOnHover?: boolean;
}) {
  const Component = asChild ? Slot.Root : 'button';

  return (
    <Component
      data-slot="sidebar-menu-action"
      data-sidebar="menu-action"
      className={ClassNames.combine(
        'absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform peer-hover/menu-button:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
        // Increases the hit area of the button on mobile.
        'after:absolute after:-inset-2 md:after:hidden',
        'peer-data-[size=sm]/menu-button:top-1',
        'peer-data-[size=default]/menu-button:top-1.5',
        'peer-data-[size=lg]/menu-button:top-2.5',
        'group-data-[collapsible=icon]:hidden',
        showOnHover &&
          'group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground data-[state=open]:opacity-100 md:opacity-0',
        className,
      )}
      {...properties}
    />
  );
}

function SidebarMenuBadge({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={ClassNames.combine(
        'pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium text-sidebar-foreground tabular-nums select-none',
        'peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground',
        'peer-data-[size=sm]/menu-button:top-1',
        'peer-data-[size=default]/menu-button:top-1.5',
        'peer-data-[size=lg]/menu-button:top-2.5',
        'group-data-[collapsible=icon]:hidden',
        className,
      )}
      {...properties}
    />
  );
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...properties
}: React.ComponentProps<'div'> & {
  showIcon?: boolean;
}) {
  const skeletonStyle: SidebarStyle = { '--skeleton-width': SidebarPolicy.SkeletonWidth };

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={ClassNames.combine('flex h-8 items-center gap-2 rounded-md px-2', className)}
      {...properties}
    >
      {showIcon && <Skeleton className="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={skeletonStyle}
      />
    </div>
  );
}

function SidebarMenuSub({ className, ...properties }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={ClassNames.combine(
        'mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5',
        'group-data-[collapsible=icon]:hidden',
        className,
      )}
      {...properties}
    />
  );
}

function SidebarMenuSubItem({ className, ...properties }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={ClassNames.combine('group/menu-sub-item relative', className)}
      {...properties}
    />
  );
}

function SidebarMenuSubButton({
  asChild = false,
  size = 'md',
  isActive = false,
  className,
  ...properties
}: React.ComponentProps<'a'> & {
  asChild?: boolean;
  size?: 'sm' | 'md';
  isActive?: boolean;
}) {
  const Component = asChild ? Slot.Root : 'a';

  return (
    <Component
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={ClassNames.combine(
        'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground ring-sidebar-ring outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground',
        'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        'group-data-[collapsible=icon]:hidden',
        className,
      )}
      {...properties}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
};
