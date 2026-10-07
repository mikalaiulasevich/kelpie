import { describe, expect, it, vi } from 'vitest';
import { ActionShortcutCatalog, ActionShortcuts } from '../../source/workspace/action-shortcuts';
import { WorkspaceShortcutCases } from '../cases/workspace-shortcut-cases';
import { WorkspaceShortcutFixtures } from '../fixtures/workspace-shortcut-fixtures';

import { ActionShortcutCases } from '../cases/action-shortcut-cases';

describe('button keyboard shortcuts', () => {
  it.each(ActionShortcutCases.Recognized)(
    'resolves $code to the enabled page action',
    ({ code, expected }) => {
      const bindings = Object.values(ActionShortcutCatalog).map((shortcut) => ({
        shortcut,
        enabled: true,
        activate: vi.fn(),
      }));
      const event = WorkspaceShortcutFixtures.event({ code });
      const context = { editing: false, overlayOpen: false };

      expect(ActionShortcuts.resolve(event, context, bindings)?.shortcut.aria).toBe(expected);
      expect(
        ActionShortcuts.resolve(
          event,
          context,
          bindings.map((binding) => ({ ...binding, enabled: false })),
        ),
      ).toBeUndefined();
      expect(ActionShortcuts.resolve(event, context, [])).toBeUndefined();
    },
  );

  it.each(WorkspaceShortcutCases.IgnoredEvents)('ignores $label', ({ overrides }) => {
    const binding = { shortcut: ActionShortcutCatalog.Refresh, enabled: true, activate: vi.fn() };
    const event = WorkspaceShortcutFixtures.event({ code: 'KeyR', ...overrides });

    expect(
      ActionShortcuts.resolve(event, { editing: false, overlayOpen: false }, [binding]),
    ).toBeUndefined();
  });

  it.each(WorkspaceShortcutCases.BlockedContexts)(
    'ignores blocked context $editing / $overlayOpen',
    (context) => {
      const binding = { shortcut: ActionShortcutCatalog.Filters, enabled: true, activate: vi.fn() };

      expect(
        ActionShortcuts.resolve(WorkspaceShortcutFixtures.event({ code: 'KeyF' }), context, [
          binding,
        ]),
      ).toBeUndefined();
    },
  );
});
