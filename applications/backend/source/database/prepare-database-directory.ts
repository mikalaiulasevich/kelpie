import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { SQLiteFiles } from './sqlite-files.js';
import { readApplicationEnvironment } from '../environment/read-application-environment.js';

const environment = readApplicationEnvironment(process.env);
await SQLiteFiles.prepareDirectory(environment.databaseUrl);
// Initialize the SQLite file through the same driver as the application before
// asking the schema engine to open it. This does not create application tables.
const connection = await new PrismaBetterSqlite3({ url: environment.databaseUrl }).connect();
await connection.dispose();
