import { useEffect, useState } from 'react';
import { WorkspaceNavigation } from './workspace-navigation';

export function useWorkspaceNavigation() {
  const [location, setLocation] = useState(() => WorkspaceNavigation.read());

  useEffect(() => {
    const onNavigation = () => setLocation(WorkspaceNavigation.read());
    globalThis.addEventListener('hashchange', onNavigation);

    return () => globalThis.removeEventListener('hashchange', onNavigation);
  }, []);

  return location;
}
