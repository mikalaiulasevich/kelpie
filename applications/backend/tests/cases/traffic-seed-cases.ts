export const TrafficSeedCases = {
  InvalidArguments: [
    { arguments: ['--target=local'] },
    { arguments: ['--target=local', '--run=valid', '--run=duplicate'] },
    { arguments: ['--target=remote', '--run=../unsafe'] },
    { arguments: ['--target=local', '--run=valid', '--sessions=0'] },
    { arguments: ['--target=local', '--run=valid', '--days=91'] },
    { arguments: ['--target=local', '--run=valid', '--unknown=1'] },
  ],
} as const;
