import {
  WorkspaceShortcuts,
  type WorkspaceShortcutContext,
  type WorkspaceShortcutEvent,
} from './workspace-shortcuts';

export const ActionShortcutCatalog = {
  Filters: { code: 'KeyF', key: 'F', aria: 'Alt+F' },
  Refresh: { code: 'KeyR', key: 'R', aria: 'Alt+R' },
  Import: { code: 'KeyO', key: 'O', aria: 'Alt+O' },
} as const;

export type ActionShortcut = (typeof ActionShortcutCatalog)[keyof typeof ActionShortcutCatalog];

export interface ActionShortcutBinding {
  readonly shortcut: ActionShortcut;
  readonly enabled: boolean;
  readonly activate: () => void;
}

export const ActionShortcuts = {
  resolve(
    event: WorkspaceShortcutEvent,
    context: WorkspaceShortcutContext,
    bindings: readonly ActionShortcutBinding[],
  ): Optional<ActionShortcutBinding> {
    if (WorkspaceShortcuts.isBlocked(event, context)) {
      return undefined;
    }

    return bindings.find((binding) => binding.enabled && binding.shortcut.code === event.code);
  },
};
