export const FrameworkLoggingPolicy = {
  // The shared context allowlist must remain unchanged across log calls; other arguments may contain credentials.
  Contexts: Object.freeze([
    'NestFactory',
    'NestApplication',
    'InstanceLoader',
    'RoutesResolver',
    'RouterExplorer',
    'ExceptionHandler',
    'PackageLoader',
    'HttpAdapterHost',
  ]),
} as const;
