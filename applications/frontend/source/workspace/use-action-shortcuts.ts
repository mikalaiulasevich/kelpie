import { useEffect } from 'react';
import { ActionShortcuts, type ActionShortcutBinding } from './action-shortcuts';
import { WorkspaceShortcuts } from './workspace-shortcuts';

export function useActionShortcuts(bindings: readonly ActionShortcutBinding[]): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const binding = ActionShortcuts.resolve(
        event,
        WorkspaceShortcuts.context(event.target),
        bindings,
      );

      if (!binding) {
        return;
      }

      event.preventDefault();
      binding.activate();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bindings]);
}
