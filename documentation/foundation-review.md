# Foundation engineering review

## Scope

Review covers the application scaffold, configuration contracts/runtime, initial database schema, health endpoints, development startup, and dependency selection. Complete funnel behavior and public production deployment are outside this foundation milestone.

## Requirements and correctness

Preserve all supplied configuration bytes. Validate original versions and malformed fixtures. Exercise A/B ordering, conditional office and compliance branches, omitted variant steps, numeric increments, first-match results, and hidden-answer exclusion.

The session command layer must subsequently enforce version pinning, stable assignment, reconfirmation of reopened answers, optimistic concurrency, and atomic events. The foundation must not represent these features as complete.

## Security

Configuration preflight bounds depth, node count, and estimated document size before schema validation. Reserved object keys are rejected; dictionary references must resolve own properties. Regression cases cover inherited names such as `constructor`, `toString`, and `hasOwnProperty`.

Backend errors do not expose exception contents. JSON body size and server timeouts are bounded. Browser readiness requests have cancellation and a timeout. Administrator authentication and user authorization are not yet implemented, and no corresponding mutation endpoints are exposed.

## Dependency advisories

The initial audit reported six affected package entries, including transitive effects. Keep the selected framework versions and pin patched transitive packages:

| Package      | Selected version | Reason                                                                                             |
| ------------ | ---------------- | -------------------------------------------------------------------------------------------------- |
| deepmerge-ts | 8.0.2            | Fix recursive graph stack exhaustion in the Prisma configuration dependency                        |
| mysql2       | 3.24.5           | Fix authentication downgrade and unbounded decompression in Prisma tooling's transitive dependency |
| shell-quote  | 1.12.0           | Fix command injection affecting development process tooling                                        |

References: [DeepmergeTS advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), [MySQL authentication advisory](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr), [MySQL decompression advisory](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3), [shell-quote advisory](https://github.com/advisories/GHSA-pqg4-j6r4-53mv).

These dependencies are used by local tooling, not an exposed MySQL service or a configuration upload merge endpoint. The override for deepmerge-ts crosses a major version and therefore requires Prisma configuration loading, generation, schema validation, migrations, and application integration checks. Auditing is time-specific and does not establish that software has no vulnerabilities.

## Idempotency

The schema enforces unique version numbers, operation identifiers, and event identifiers. These constraints are necessary but do not implement replay semantics by themselves. Retry-safe session commands, request fingerprints, stored responses, and batch receipts remain planned work.

## Complexity and performance

Runtime resolution traverses the selected sequence and evaluates conditions against valid active answers. Cost includes step traversal, option/answer validation, and condition collection membership. Keep these inputs bounded and document measured behavior separately from theoretical complexity.

Readiness checks are small database queries. No complete analytical query or traffic benchmark exists yet. No application-scale performance claim is justified by pure-function microbenchmarks.

## Verification evidence

Local verification passed after fresh `npm ci` installations on Node.js 26.10.0 with npm 11.19.1 and Node.js 24.16.0 with npm 11.13.0:

- Configuration checksums for all three supplied documents.
- ESLint, Prettier, strict TypeScript, shared package builds, backend build, and frontend production build.
- 43 tests: 16 backend, 4 frontend request-boundary, 15 configuration, and 8 runtime tests.
- Prisma generation, schema validation, and migration deployment; temporary-database integration uses the real migration command.
- `npm audit --audit-level=high`: zero reported vulnerabilities at verification time.
- Development launcher started both applications; direct health checks and the frontend proxy returned successful actual readiness responses.
- Browser inspection confirmed the ready state and readable layouts at desktop and 390 by 844 mobile viewport sizes.

The reproducible `npm run benchmark:runtime` command measured 12 synthetic version/variant scenarios on an Apple M4, macOS arm64, Node.js 26.10.0. Seven timed samples followed warm-up:

| Operation                | Iterations per sample | Median sample time |
| ------------------------ | --------------------- | ------------------ |
| Configuration validation | 1,000                 | 52.199 ms          |
| Route resolution         | 10,000                | 6.574 ms           |
| Result resolution        | 10,000                | 10.653 ms          |

These are local pure-function measurements, not server throughput, worst-case input benchmarks, or deployment capacity guarantees.

GitHub Actions targets Node.js 24 and 26, but push and manual runs returned `startup_failure` before creating jobs. No execution logs or check-run annotations were provided. The workflow passed independent `actionlint` 1.7.12 validation, and both pinned action commits were confirmed through GitHub's API. The cause remains undetermined; remote Linux verification is not confirmed. See [the manual run](https://github.com/mikalaiulasevich/kelpie/actions/runs/37486945771).

Generated outputs, local databases, and secrets remain outside version control.
