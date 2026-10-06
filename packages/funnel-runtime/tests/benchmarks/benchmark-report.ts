import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { arch, cpus, platform } from 'node:os';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BenchmarkSuite } from './measurement-types.js';
import { MeasurementPolicy } from './measurement-policy.js';
import { MeasurementMessages } from './measurement-messages.js';
import type {
  BenchmarkEnvironment,
  BenchmarkReportData,
  BenchmarkReportMetadata,
  BenchmarkMeasurementResult,
} from './measurement-types.js';

const repositoryDirectory = fileURLToPath(new URL('../../../../', import.meta.url));

const BenchmarkIdentity = {
  async hash(
    directories: ReadonlyList<string>,
    identityFiles: ReadonlyList<string> = [],
  ): Promise<string> {
    const paths: string[] = [...identityFiles];

    for (const directory of directories) {
      const entries = await readdir(resolve(repositoryDirectory, directory), {
        recursive: true,
        withFileTypes: true,
      });
      paths.push(
        ...entries
          .filter((entry) => entry.isFile())
          .map((entry) => relative(repositoryDirectory, resolve(entry.parentPath, entry.name))),
      );
    }

    const hash = createHash(MeasurementPolicy.HashAlgorithm);

    for (const path of paths.sort()) {
      hash
        .update(path)
        .update('\0')
        .update(await readFile(resolve(repositoryDirectory, path)))
        .update('\0');
    }

    return hash.digest(MeasurementPolicy.HashEncoding);
  },

  async verify(environment: BenchmarkEnvironment): Promise<void> {
    const sourceHash = await BenchmarkIdentity.hash(
      MeasurementPolicy.SourceDirectories,
      MeasurementPolicy.IdentityFiles,
    );
    const compiledHash = await BenchmarkIdentity.hash(MeasurementPolicy.CompiledDirectories);
    assert.ok(
      sourceHash === environment.sourceHash && compiledHash === environment.compiledHash,
      MeasurementMessages.ChangedInputs,
    );
  },

  async environment(): Promise<BenchmarkEnvironment> {
    let revision: string = MeasurementMessages.UnknownRevision;
    let workingTreeChanged = true;

    try {
      revision = execFileSync(
        MeasurementPolicy.GitExecutable,
        [...MeasurementPolicy.GitArguments],
        {
          cwd: repositoryDirectory,
          encoding: MeasurementPolicy.TextEncoding,
        },
      ).trim();
      workingTreeChanged =
        execFileSync(MeasurementPolicy.GitExecutable, [...MeasurementPolicy.GitStatusArguments], {
          cwd: repositoryDirectory,
          encoding: MeasurementPolicy.TextEncoding,
        }).trim().length > 0;
    } catch {
      // Exported source archives may not contain Git metadata; the content hash remains available.
    }

    return {
      node: process.version,
      v8: process.versions.v8,
      platform: platform(),
      architecture: arch(),
      processor: cpus()[0]?.model,
      revision,
      workingTreeChanged,
      sourceHash: await BenchmarkIdentity.hash(
        MeasurementPolicy.SourceDirectories,
        MeasurementPolicy.IdentityFiles,
      ),
      compiledHash: await BenchmarkIdentity.hash(MeasurementPolicy.CompiledDirectories),
    };
  },
} as const;

const BenchmarkTable = {
  escape(value: TextOrNumber): string {
    return `"${String(value).replaceAll('"', '""')}"`;
  },

  async append(directory: string, rows: string): Promise<void> {
    const history = resolve(directory, MeasurementPolicy.HistoryFile);

    try {
      await writeFile(
        history,
        `${MeasurementPolicy.HistoryHeader}\n`,
        MeasurementPolicy.ExclusiveWriteOptions,
      );
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !('code' in error) ||
        error.code !== MeasurementPolicy.FileExistsCode
      ) {
        throw error;
      }
    }

    await appendFile(history, rows);
  },

  rows(report: BenchmarkReportData): string {
    return (
      report.results
        .map((result) =>
          [
            report.run,
            report.environment.revision,
            report.environment.sourceHash,
            result.name,
            result.size,
            result.iterations,
            result.samplesNanosecondsPerOperation.length,
            result.medianNanosecondsPerOperation.toFixed(MeasurementPolicy.DecimalPlaces),
            result.minimumNanosecondsPerOperation.toFixed(MeasurementPolicy.DecimalPlaces),
            result.maximumNanosecondsPerOperation.toFixed(MeasurementPolicy.DecimalPlaces),
          ]
            .map(BenchmarkTable.escape)
            .join(','),
        )
        .join('\n') + '\n'
    );
  },
} as const;

export const BenchmarkReport = {
  async prepare(): Promise<BenchmarkReportMetadata> {
    return {
      suite: BenchmarkSuite.Runtime,
      run: `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}`,
      scope: MeasurementMessages.Scope,
      warmupIterations: MeasurementPolicy.WarmupIterations,
      samplingOrder: MeasurementMessages.SamplingOrder,
      environment: await BenchmarkIdentity.environment(),
    };
  },

  async save(
    metadata: BenchmarkReportMetadata,
    results: ReadonlyList<BenchmarkMeasurementResult>,
  ): Promise<string> {
    await BenchmarkIdentity.verify(metadata.environment);
    const report: BenchmarkReportData = { ...metadata, results };
    const directory = resolve(repositoryDirectory, MeasurementPolicy.OutputDirectory);
    await mkdir(directory, { recursive: true });
    await writeFile(
      resolve(directory, `${report.run}.json`),
      `${JSON.stringify(report, null, 2)}\n`,
      MeasurementPolicy.ExclusiveWriteOptions,
    );
    const rows = BenchmarkTable.rows(report);
    await BenchmarkTable.append(directory, rows);
    await writeFile(
      resolve(directory, MeasurementPolicy.LatestFile),
      `${MeasurementPolicy.HistoryHeader}\n${rows}`,
    );

    return directory;
  },
} as const;
