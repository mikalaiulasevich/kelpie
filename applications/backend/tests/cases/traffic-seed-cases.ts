export const TrafficSeedCases = {
  InvalidArguments: [
    { arguments: ['--target=local'] },
    { arguments: ['--target=local', '--run=valid', '--run=duplicate'] },
    { arguments: ['--target=remote', '--run=../unsafe'] },
    { arguments: ['--target=local', '--run=valid', '--sessions=0'] },
    { arguments: ['--target=local', '--run=valid', '--days=91'] },
    { arguments: ['--target=local', '--run=valid', '--unknown=1'] },
    { arguments: ['--target=local', '--run=valid', '--seed='] },
    { arguments: ['--target=local', '--run=valid', '--sessions='] },
    { arguments: ['--target=local', '--run=valid', '--days='] },
    { arguments: ['--target=local', '--run=valid', '--output='] },
    { arguments: ['--target=', '--run=valid'] },
    { arguments: ['--target=local', '--run='] },
  ],
} as const;
