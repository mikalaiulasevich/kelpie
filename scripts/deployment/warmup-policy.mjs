export const WarmupPolicy = /** @type {const} */ ({
  OriginEnvironment: 'KELPIE_PUBLIC_ORIGIN',
  TimeoutMilliseconds: 75_000,
  MaximumHealthBytes: 4_096,
  Targets: [
    { path: '/api/health/ready', contentType: 'application/json', health: true },
    { path: '/', contentType: 'text/html', health: false },
    { path: '/administration/', contentType: 'text/html', health: false },
  ],
});
