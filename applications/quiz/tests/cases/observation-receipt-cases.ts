export const ObservationReceiptCases = {
  InvalidBatches: [
    { name: 'empty receipts', indexes: [] },
    { name: 'incomplete receipts', indexes: [0] },
    { name: 'duplicate receipts', indexes: [0, 0] },
    { name: 'missing identifiers', indexes: [0, -1] },
    { name: 'extra receipts', indexes: [0, 1, 0] },
  ],
} as const;
