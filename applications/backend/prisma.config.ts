import 'dotenv/config';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';
import { applicationDirectory } from './source/application_directory.js';
import { readApplicationEnvironment } from './source/environment/read_application_environment.js';

export default defineConfig({
  schema: resolve(applicationDirectory, 'prisma/schema.prisma'),
  migrations: { path: resolve(applicationDirectory, 'prisma/migrations') },
  datasource: { url: readApplicationEnvironment(process.env).databaseUrl },
});
