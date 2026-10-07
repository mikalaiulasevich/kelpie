export const FrameworkLoggingPolicy = {
  // Framework contexts are allowlisted because optional logger arguments can contain credentials.
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
