export const SQLitePolicy = {
  EnabledSetting: 1,
  FileUrlPrefix: 'file:',
  RemoteUrlPrefix: 'libsql://',
  BusyTimeoutMilliseconds: 5_000,
  RemoteRequestTimeoutMilliseconds: 180_000,
} as const;
