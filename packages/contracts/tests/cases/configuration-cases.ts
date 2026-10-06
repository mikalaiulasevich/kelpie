const whitespaceCases = [
  { name: 'space', value: ' ' },
  { name: 'tabs and newlines', value: '\t\n' },
  { name: 'nonbreaking space', value: '\u00a0' },
  { name: 'byte order mark', value: '\ufeff' },
] as const;

export const ConfigurationCases = {
  preservedVersions: [1, 2, 3],
  inheritedReferences: ['constructor', 'toString', 'hasOwnProperty'],
  blankInformationContent: ['title', 'body', 'primaryActionLabel'].flatMap((field) =>
    whitespaceCases.map(({ name, value }) => ({ field, name, value })),
  ),
} as const;
