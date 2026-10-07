export const WorkspaceShortcutCases = {
  Recognized: [
    { code: 'Digit1', expected: 'analytics' },
    { code: 'Digit2', expected: 'versions' },
    { code: 'Digit3', expected: 'history' },
    { code: 'Slash', expected: 'help' },
  ],
  IgnoredEvents: [
    { label: 'no Alt modifier', overrides: { altKey: false } },
    { label: 'Control modifier including AltGr', overrides: { ctrlKey: true } },
    { label: 'Meta modifier', overrides: { metaKey: true } },
    { label: 'Shift modifier', overrides: { shiftKey: true } },
    { label: 'a held key', overrides: { repeat: true } },
    { label: 'IME composition', overrides: { isComposing: true } },
    { label: 'an already handled event', overrides: { defaultPrevented: true } },
    { label: 'an unregistered key', overrides: { code: 'KeyP' } },
  ],
  BlockedContexts: [
    { editing: true, overlayOpen: false },
    { editing: false, overlayOpen: true },
    { editing: true, overlayOpen: true },
  ],
} as const;
