export const WorkspaceShortcutFixtures = {
  event(
    overrides: Partial<KeyboardEvent> = {},
  ): Pick<
    KeyboardEvent,
    | 'code'
    | 'altKey'
    | 'ctrlKey'
    | 'metaKey'
    | 'shiftKey'
    | 'repeat'
    | 'isComposing'
    | 'defaultPrevented'
  > {
    return {
      code: 'Digit1',
      altKey: true,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      repeat: false,
      isComposing: false,
      defaultPrevented: false,
      ...overrides,
    };
  },
};
