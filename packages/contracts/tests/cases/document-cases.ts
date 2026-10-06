export const DocumentCases = {
  nonJsonValues: [
    { name: 'undefined', value: undefined },
    { name: 'function', value: () => undefined },
    { name: 'symbol', value: Symbol('value') },
    { name: 'big integer', value: BigInt(1) },
  ],
  nonFiniteNumbers: [
    { name: 'NaN', value: NaN },
    { name: 'positive infinity', value: Infinity },
    { name: 'negative infinity', value: -Infinity },
  ],
  nonPlainObjects: [
    { name: 'date', value: new Date(0) },
    { name: 'map', value: new Map() },
    { name: 'inherited object', value: Object.create({ inherited: true }) },
  ],
  reservedKeys: ['__proto__', 'constructor', 'prototype'],
} as const;
