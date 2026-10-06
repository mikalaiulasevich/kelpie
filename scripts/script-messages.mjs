export const BuildMessages = /** @type {const} */ ({
  UnsafeCleanup:
    'Build cleanup must run from a configured workspace and only remove its generated output.',
});

export const ConfigurationIntegrityMessages = /** @type {const} */ ({
  /** @param {string} fileName */
  verifiedContents(fileName) {
    return `${fileName}: original checksum verified`;
  },
  MissingEntries: 'The manifest must contain all three supplied configurations.',
  /** @param {string} fileName */
  unexpectedEntry(fileName) {
    return `Unexpected configuration manifest entry: ${fileName}`;
  },
  /** @param {string} fileName */
  changedContents(fileName) {
    return `Configuration changed from its supplied contents: ${fileName}`;
  },
});

export const DevelopmentMessages = /** @type {const} */ ({
  SignalFailed: 'Unable to signal development process:',
  /** @param {string} workspaceName */
  startFailed(workspaceName) {
    return `Unable to start ${workspaceName}:`;
  },
});

export const TestLayoutMessages = /** @type {const} */ ({
  Passed: 'Recognized test, fixture, case and typecheck filenames are inside tests/.',
  /** @param {string} path */
  misplacedFile(path) {
    return `Test support and suites must be inside tests/: ${path}`;
  },
});
