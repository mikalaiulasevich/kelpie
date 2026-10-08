import { Type, type Static } from 'typebox';

export const DatabaseBackupSchemas = {
  Request: Type.Object({ sourcePath: Type.String(), destinationPath: Type.String() }),
  Report: Type.Object({
    bytes: Type.Integer({ minimum: 0 }),
    sha256: Type.String(),
    migrations: Type.Array(Type.String()),
    tables: Type.Array(Type.Object({ name: Type.String(), rows: Type.String() })),
  }),
} as const;

export type DatabaseBackupRequest = Static<typeof DatabaseBackupSchemas.Request>;

export type DatabaseBackupReport = Static<typeof DatabaseBackupSchemas.Report>;
