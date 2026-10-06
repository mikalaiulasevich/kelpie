import 'dotenv/config';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';
import { DatabasePaths } from './source/database/database-paths.js';
import { applicationDirectory } from './source/application-directory.js';
import { ApplicationEnvironmentReader } from './source/environment/read-application-environment.js';

export default defineConfig({
  schema: resolve(applicationDirectory, DatabasePaths.Schema),
  migrations: { path: resolve(applicationDirectory, DatabasePaths.Migrations) },
  datasource: { url: ApplicationEnvironmentReader.read(process.env).databaseUrl },
});
