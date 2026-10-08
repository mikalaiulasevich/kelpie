export interface DatabaseBackupRequest {
  readonly sourcePath: string;
  readonly destinationPath: string;
}

export interface DatabaseBackupReport {
  readonly bytes: number;
  readonly sha256: string;
  readonly migrations: ReadonlyList<string>;
  readonly tables: ReadonlyList<{ readonly name: string; readonly rows: string }>;
}
