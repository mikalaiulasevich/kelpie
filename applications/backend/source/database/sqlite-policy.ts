export const SQLitePolicy = {
  EnabledSetting: 1,
  FileUrlPrefix: 'file:',
  RemoteUrlPrefix: 'libsql://',
  BusyTimeoutMilliseconds: 5_000,
  RemoteRequestTimeoutMilliseconds: 30_000,
} as const;
