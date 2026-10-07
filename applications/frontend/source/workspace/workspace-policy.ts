export const WorkspaceNavigationPolicy = {
  DefaultFunnel: 'workstyle-planner',
  MaximumIdentifierCharacters: 100,
  VersionIdentifierPattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  IdentifierPattern: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
} as const;

export const WorkspaceShortcutPolicy = {
  EditingSelector:
    'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="spinbutton"]',
  OverlaySelector:
    '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-slot="popover-content"]',
} as const;
