import type { NestApplicationOptions } from '@nestjs/common';

export const ApplicationPolicy = {
  FailureExitCode: 1,
  ShutdownDrainMilliseconds: 10_000,
} as const;

export const ApplicationCreationOptions = {
  bodyParser: false,
  abortOnError: false,
} as const satisfies NestApplicationOptions;
