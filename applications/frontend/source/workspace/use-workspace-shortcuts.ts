import { useEffect } from 'react';
import { WorkspaceNavigation } from './workspace-navigation';
import { WorkspaceShortcutCatalog, WorkspaceShortcuts } from './workspace-shortcuts';

export function useWorkspaceShortcuts(funnelIdentifier: string, openHelp: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const shortcut = WorkspaceShortcuts.resolve(event, WorkspaceShortcuts.context(event.target));

      if (!shortcut) {
        return;
      }

      event.preventDefault();

      if (shortcut === WorkspaceShortcutCatalog.Help) {
        openHelp();

        return;
      }

      WorkspaceNavigation.navigate(shortcut, funnelIdentifier);
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [funnelIdentifier, openHelp]);
}
