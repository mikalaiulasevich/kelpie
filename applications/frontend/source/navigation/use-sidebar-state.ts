import * as React from 'react';
import { isFunction } from 'es-toolkit/predicate';
import { useIsMobile } from './use-mobile';
import { SidebarPolicy } from './sidebar-policy';
import type { SidebarContextProperties, SidebarStateOptions } from './sidebar-context';

export function useSidebarState({defaultOpen = true, open: controlledOpen, onOpenChange}: SidebarStateOptions): SidebarContextProperties {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);

  // Controlled consumers own the value; otherwise this hook retains local state.
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = isFunction(value) ? value(open) : value;

      if (onOpenChange) {
        onOpenChange(openState);
      } else {
        setInternalOpen(openState);
      }

      // This sets the cookie to keep the sidebar state.
      document.cookie = `${SidebarPolicy.CookieName}=${openState}; path=/; max-age=${SidebarPolicy.CookieMaxAge}`;
    },
    [onOpenChange, open],
  );

  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
  }, [isMobile, setOpen, setOpenMobile]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === SidebarPolicy.KeyboardShortcut && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const state = open ? 'expanded' : 'collapsed';

  const contextValue = React.useMemo<SidebarContextProperties>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
  );

  return contextValue;
}
