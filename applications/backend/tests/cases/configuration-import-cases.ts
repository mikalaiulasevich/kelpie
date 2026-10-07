export const ConfigurationImportCases = {
  SuppliedVersions: [1, 2, 3],
  InvalidDocuments: [
    { name: 'missing configuration', document: null },
    { name: 'incomplete configuration', document: { version: 1 } },
  ],
} as const;
