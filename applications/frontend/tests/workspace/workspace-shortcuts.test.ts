import { describe, expect, it } from 'vitest';
import { WorkspaceShortcuts } from '../../source/workspace/workspace-shortcuts';
import { WorkspaceShortcutCases } from '../cases/workspace-shortcut-cases';
import { WorkspaceShortcutFixtures } from '../fixtures/workspace-shortcut-fixtures';

describe('workspace keyboard shortcuts', () => {
  it.each(WorkspaceShortcutCases.Recognized)(
    'resolves Alt + $code to $expected',
    ({ code, expected }) => {
      const event = WorkspaceShortcutFixtures.event({ code });

      expect(WorkspaceShortcuts.resolve(event, { editing: false, overlayOpen: false })).toBe(
        expected,
      );
    },
  );

  it.each(WorkspaceShortcutCases.IgnoredEvents)('ignores $label', ({ overrides }) => {
    const event = WorkspaceShortcutFixtures.event(overrides);

    expect(
      WorkspaceShortcuts.resolve(event, { editing: false, overlayOpen: false }),
    ).toBeUndefined();
  });

  it.each(WorkspaceShortcutCases.BlockedContexts)(
    'does not navigate or open help with editing=$editing and overlayOpen=$overlayOpen',
    (context) => {
      const navigationEvent = WorkspaceShortcutFixtures.event();
      const helpEvent = WorkspaceShortcutFixtures.event({ code: 'Slash' });

      expect(WorkspaceShortcuts.resolve(navigationEvent, context)).toBeUndefined();
      expect(WorkspaceShortcuts.resolve(helpEvent, context)).toBeUndefined();
    },
  );
});
