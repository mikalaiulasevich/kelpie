import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isPlainObject } from 'es-toolkit/predicate';
import { BackendTestPolicy } from './backend-test-policy.js';

const ReferenceSQLitePolicy = {
  DirectoryPrefix: 'kelpie-migration-reference-',
  Filename: 'reference.sqlite',
  Script: `import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
const request = JSON.parse(readFileSync(0, 'utf8'));
const database = new DatabaseSync(process.argv[1]);
try {
  database.exec('PRAGMA foreign_keys = ON');
  if (request.operation === 'execute') {
    database.exec(request.statement);
    process.stdout.write('[]');
  } else {
    const statement = database.prepare(request.statement);
    const rows = request.operation === 'read' ? statement.all() : [];
    if (request.operation === 'write') statement.run(...request.parameters);
    process.stdout.write(JSON.stringify(rows));
  }
} finally {
  database.close();
}`,
} as const;

const ReferenceSQLiteMessages = {
  InvalidRows: 'The reference SQLite process returned invalid rows.',
} as const;

const ReferenceOperation = { Execute: 'execute', Read: 'read', Write: 'write' } as const;

/** Runs migration reference SQL on Node's built-in SQLite under either test runtime. */
export class ReferenceSQLiteFixture {
  private readonly directory = mkdtempSync(join(tmpdir(), ReferenceSQLitePolicy.DirectoryPrefix));

  execute(statement: string): void {
    this.run(ReferenceOperation.Execute, statement);
  }

  read(statement: string): ReadonlyList<TextDictionary> {
    return this.run(ReferenceOperation.Read, statement);
  }

  write(statement: string, parameters: ReadonlyList<TextOrNumber>): void {
    this.run(ReferenceOperation.Write, statement, parameters);
  }

  close(): void {
    rmSync(this.directory, { recursive: true, force: true });
  }

  private run(
    operation: ValueOf<typeof ReferenceOperation>,
    statement: string,
    parameters: ReadonlyList<TextOrNumber> = [],
  ): ReadonlyList<TextDictionary> {
    const output = execFileSync(
      BackendTestPolicy.NodeExecutable,
      [
        '--input-type=module',
        '-e',
        ReferenceSQLitePolicy.Script,
        join(this.directory, ReferenceSQLitePolicy.Filename),
      ],
      {
        encoding: 'utf8',
        input: JSON.stringify({ operation, statement, parameters }),
        timeout: BackendTestPolicy.TimeoutMilliseconds,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    const rows: unknown = JSON.parse(output);
    assert.ok(
      Array.isArray(rows) && rows.every(isPlainObject),
      ReferenceSQLiteMessages.InvalidRows,
    );

    return rows;
  }
}
