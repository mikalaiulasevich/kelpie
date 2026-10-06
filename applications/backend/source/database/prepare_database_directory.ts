import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { readApplicationEnvironment } from '../environment/read_application_environment.js';

const environment = readApplicationEnvironment(process.env);
await mkdir(dirname(environment.databaseUrl.slice(5)), { recursive: true });
// Initialize the SQLite file through the same driver as the application before
// asking the schema engine to open it. This does not create application tables.
const connection = await new PrismaBetterSqlite3({ url: environment.databaseUrl }).connect();
await connection.dispose();
