import 'dotenv/config';
import { DatabaseAdapters } from './database-adapters.js';
import { SQLiteFiles } from './sqlite-files.js';
import { ApplicationEnvironmentReader } from '../environment/read-application-environment.js';

const environment = ApplicationEnvironmentReader.read(process.env);
await SQLiteFiles.prepareDirectory(environment.databaseUrl);
// Initialize the SQLite file through the same driver as the application before
// asking the schema engine to open it. This does not create application tables.
const connection = await DatabaseAdapters.create(environment.databaseUrl).connect();
await connection.dispose();
