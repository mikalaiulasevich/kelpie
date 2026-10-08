import { WorkspaceShortcutPolicy } from './workspace-policy';
import { Type, type Static } from 'typebox';
import { WorkspacePage } from './workspace-navigation';
import { WorkspaceContent } from './workspace-content';

export const WorkspaceShortcutContextSchema = Type.Object({
  editing: Type.Boolean(),
  overlayOpen: Type.Boolean(),
});

export type WorkspaceShortcutContext = Static<typeof WorkspaceShortcutContextSchema>;

export type WorkspaceShortcutEvent = Pick<
  KeyboardEvent,
  | 'code'
  | 'altKey'
  | 'ctrlKey'
  | 'metaKey'
  | 'shiftKey'
  | 'repeat'
  | 'isComposing'
  | 'defaultPrevented'
>;

export const WorkspaceShortcutCatalog = {
  Navigation: [
    { page: WorkspacePage.Analytics, label: WorkspaceContent.Analytics, code: 'Digit1', key: '1' },
    { page: WorkspacePage.Versions, label: WorkspaceContent.Versions, code: 'Digit2', key: '2' },
    { page: WorkspacePage.History, label: WorkspaceContent.History, code: 'Digit3', key: '3' },
  ],
  Help: 'help',
  HelpCode: 'Slash',
} as const;

export type WorkspaceShortcut =
  | (typeof WorkspaceShortcutCatalog.Navigation)[number]['page']
  | typeof WorkspaceShortcutCatalog.Help;

export const WorkspaceShortcuts = {
  resolve(
    event: WorkspaceShortcutEvent,
    context: WorkspaceShortcutContext,
  ): Optional<WorkspaceShortcut> {
    if (WorkspaceShortcuts.isBlocked(event, context)) {
      return undefined;
    }

    if (event.code === WorkspaceShortcutCatalog.HelpCode) {
      return WorkspaceShortcutCatalog.Help;
    }

    return WorkspaceShortcutCatalog.Navigation.find((item) => item.code === event.code)?.page;
  },

  context(target: EventTarget | null): WorkspaceShortcutContext {
    return {
      editing: WorkspaceShortcuts.isEditing(target),
      overlayOpen: WorkspaceShortcuts.hasOpenOverlay(),
    };
  },

  isBlocked(event: WorkspaceShortcutEvent, context: WorkspaceShortcutContext): boolean {
    return (
      context.editing ||
      context.overlayOpen ||
      event.defaultPrevented ||
      event.repeat ||
      event.isComposing ||
      !event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    );
  },

  isEditing(target: EventTarget | null): boolean {
    return (
      target instanceof Element && Boolean(target.closest(WorkspaceShortcutPolicy.EditingSelector))
    );
  },

  hasOpenOverlay(): boolean {
    return Boolean(document.querySelector(WorkspaceShortcutPolicy.OverlaySelector));
  },
} as const;
