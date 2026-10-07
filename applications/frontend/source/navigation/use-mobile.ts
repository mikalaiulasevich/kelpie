import { useSyncExternalStore } from 'react';
import { NavigationPolicy } from './navigation-policy';

const MobileViewport = {
  subscribe(onChange: () => void) {
    const mediaQuery = window.matchMedia(`(max-width: ${NavigationPolicy.MobileBreakpoint - 1}px)`);
    mediaQuery.addEventListener('change', onChange);

    return () => mediaQuery.removeEventListener('change', onChange);
  },

  getSnapshot() {
    return window.matchMedia(`(max-width: ${NavigationPolicy.MobileBreakpoint - 1}px)`).matches;
  },

  getServerSnapshot() {
    return false;
  },
};

export function useIsMobile() {
  return useSyncExternalStore(
    MobileViewport.subscribe,
    MobileViewport.getSnapshot,
    MobileViewport.getServerSnapshot,
  );
}
