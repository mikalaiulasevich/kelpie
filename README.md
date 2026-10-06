# Funnel Runtime

A TypeScript foundation for configurable web funnels with immutable versions, session-pinned experiments, event ingestion, and session-based analytics.

This repository currently provides the application foundation. The complete funnel, administrator sign-in, publication endpoints, event batching, analytics dashboard, traffic generator, and public deployment are subsequent milestones in [the implementation plan](IMPLEMENTATION_PLAN.md).

## Local development

Use Node.js 24 or 26 and npm 11. The repository pins npm 11.19.1 and uses npm workspaces. Node.js 24 is the intended deployment baseline; the initial foundation was verified on both versions. Subsequent refactors are verified on Node.js 24. The last recorded GitHub Actions attempt failed at startup; this is historical evidence, not a current CI status check.

Bun is the requested primary backend runtime, with Node.js/npm retained for reviewers. That migration is still pending: the current startup commands execute Node.js and the database uses `@prisma/adapter-better-sqlite3`. The checked-in `bun.lock` records dependency resolution; it does not establish Bun backend compatibility.

```sh
npm install --global npm@11.19.1
npm ci
npm run database:generate
npm run database:migrate
npm run development
```

Open the frontend at http://127.0.0.1:5173. The development server proxies `/api` to the backend at http://127.0.0.1:3000. The frontend reports actual backend readiness; it does not simulate a working funnel. Frontend HTTP requests use pinned Ky with retries disabled, same-origin credentials, no-store caching and a five-second total deadline including JSON reading. React-if owns conditional status text while exhaustive domain matching preserves typed access to the ready timestamp. Native fetch remains only in backend integration-test probes and frontend transport mocks.

The default database location is `applications/backend/data/funnel-runtime.sqlite`. To customize backend settings, copy `applications/backend/.env.example` to `applications/backend/.env`. Relative database paths resolve from the backend application directory. Local data, environment files, dependencies, and generated outputs are ignored by Git.

Shared packages are built before development startup. Restart development after changing shared packages; application source files are watched automatically. Stop both development processes with Ctrl+C.

Node workspace builds clean their own generated `distribution` directory before compiling, preventing renamed or deleted modules from surviving as stale JavaScript. Cleanup only accepts the configured workspace output paths.

## Commands

| Command                         | Purpose                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| `npm run verify`                | Configuration integrity, lint, formatting, types, tests, builds, and Prisma schema validation |
| `npm run build`                 | Build shared packages and applications                                                        |
| `npm run test`                  | Run workspace tests                                                                           |
| `npm run database:generate`     | Generate Prisma Client from the canonical schema                                              |
| `npm run database:migrate`      | Apply checked-in migrations                                                                   |
| `npm run configurations:verify` | Check original configuration checksums                                                        |
| `npm run format`                | Format authored files, preserving original configuration bytes                                |

Run production backend output after building and migrating with `npm run start --workspace=@kelpie/backend`. Deployment routing, TLS, secrets, storage persistence, and backups still require configuration. This command alone is not a production deployment.

Run `npm run benchmark:runtime` separately from correctness tests. It builds production packages, verifies 79 scenarios, warms them up and records nine timed batches per case. Fixtures and expected-result assertions stay outside timing. Run alone on an idle machine with the same Node version; compare repeated runs, not a shared-CI timing threshold.

Dictionary transformations and exact null, undefined and string guards across runtime, contracts, applications and tooling use pinned es-toolkit 1.52.0. Each importing workspace declares its dependency; root tooling owns a development dependency. Security-sensitive own-property checks and bounded validation retain their domain implementations. Measured before/after results and rejected alternatives are recorded in [the engineering review](documentation/foundation-review.md#es-toolkit-adoption-october-6).

The rejected Mnemonist experiment is complete; its dependency and dedicated runner have been removed. The [archived comparison](documentation/benchmarks/mnemonist-comparison.csv), raw reports and engineering decision remain available. The historical harness is preserved in Git revision `3387d9520f4321d562bb5c1d019e294ae96990a2`.

Results are saved automatically to [the latest table](documentation/benchmarks/latest.csv), [append-only measurement history](documentation/benchmarks/history.csv) and timestamped JSON files containing raw samples, Node/V8/CPU information, Git revision and source/compiled-artifact hashes. JSON files are authoritative if a report write is interrupted. Source or build changes during measurement reject the run. Each value is a batch-average time per operation, not a request-latency percentile. Memory bounds and algorithmic complexity are analyzed separately in [the engineering review](documentation/foundation-review.md); heap allocations and peak memory are not measured by this command.

Cases cover configuration validation, answer types, conditions and short-circuiting, variants, routing, results, combined evaluation and navigation. Inputs vary steps/options, membership lists, condition depth, result-rule position, missing/invalid answers and hidden branches, with historical v1/v2/v3 A/B checks. These pure-function measurements exclude startup, network, SQLite and full application throughput. Add benchmarks alongside future implemented hot paths; do not benchmark unimplemented session/event/analytics features.

## Structure

```text
applications/backend       NestJS bootstrap, database lifecycle, health endpoints
applications/frontend      React shell, Tailwind, shadcn/ui, real readiness check
packages/contracts         Configuration types, bounded schema and semantic validation
packages/funnel-runtime    Pure condition, answer, route, progress, and result functions
configurations             Supplied JSON documents and SHA-256 checksums
scripts                    Development launcher and configuration integrity check
documentation              Development evidence and engineering decisions
```

Source files are grouped by domain:

```text
packages/contracts/source/
  configurations/          Configuration format, schema, paths and policies
    validation/            Document bounds and validation orchestration
  conditions/              Condition types, schema and rules
  steps/                   Step types, schema and validation
  results/                 Result contracts and validation
  experiments/             Variant validation
  events/                  Event vocabulary and validation
  shared/                  Dictionary access and shared schema primitives
  index.ts                 Explicit public exports

packages/funnel-runtime/source/
  answers/                 Answer types, policies and validation
  conditions/              Condition evaluation
  experiments/             Variant resolution, overrides and types
  routes/                  Route traversal, navigation and types
  results/                 Result selection
  funnel-runtime.ts        Grouped runtime API
  index.ts                 Explicit public exports
```

Applications keep bootstrap/composition in `source/application/`, alongside their existing feature directories. Entry files and ambient declarations remain at the source root. Domain modules import their owners directly; public package imports continue through the root entry point.

[AGENTS.md](AGENTS.md) is the canonical quality contract for every coding request: inspect existing work, search analogous defects, review the final diff, correct encountered violations and report exact verification boundaries. ESLint enforces selected recurring patterns, including inline test tables, inline error text in production/tooling, messages declared in policy modules and source imports from tests. Manual review still owns semantic cohesion, security and complexity; automated checks are not a proof of a defect-free repository.

The [file-by-file audit](documentation/file-audit.json) records the initial 216 authored files, the reason for each review decision and content hashes, followed by separately recorded review updates. It also records integrity checks for the three supplied configurations and dependency lock. This is a dated review snapshot; subsequent edits require renewed review.

Every workspace keeps tests outside source, under `tests/<domain>/`, with reusable setup/data in `tests/fixtures/` and named input tables in `tests/cases/`. Contracts also keep compiler regressions in `tests/typechecks/`. `npm run tests:layout` checks recognized test/support filenames as part of verification; ESLint rejects Vitest imports from source. Integration tests use isolated temporary SQLite databases, real migrations and application startup, with teardown attempted after setup/test failures and both primary and cleanup errors preserved. Type checking includes suites, fixtures, cases and test configurations.

Authored identifiers use full names. Original JSON fields and dependency/tool conventions remain compatible at external boundaries.

## Configurations and iteration sequence

The supplied configuration files are preserved byte for byte:

- Version 1 establishes the base funnel and office-days branch.
- Version 2 adds meeting hours and a meeting-heavy result.
- Version 3 adds the compliance branch, omits tool count from variant B, and declares `recommendation_expanded`.

Configuration schemas are authored with TypeBox and validated by Ajv. Public field types derive from the schemas; explicit recursive condition edges preserve safe recursion and readonly guarantees. Required screen content is declarative, and partial variant content is validated again after merging with the base screen. The contracts typecheck also checks deliberate invalid assignments to prevent accidental widening. Runtime dispatch uses exhaustive ts-pattern matching where type alternatives benefit from it.

All use schema version 1.0. The shared validator checks structure, references, condition operand types and ordering, merged text overrides, result rules, experiment weights, and event declarations. It limits document size, nesting, node count, and reported issues. Unknown executable constructs are rejected. Human-readable trigger strings are never executed.

The pure runtime excludes hidden, omitted, and invalid answers from active route decisions and results. It resolves result rules in order and applies variant overrides. Confirmation of retained answers after reopening a branch belongs to the upcoming session command layer; pure routing cannot establish that confirmation by itself.

## Construction and domain patterns

`ApplicationFactory` is the backend composition boundary: it reads the environment once by default, or accepts validated settings explicitly, then assembles Nest providers and HTTP policies. The environment service receives an application-local snapshot through dependency injection. Tests use the same factory without patching global readers. `BackendApplicationFixture.create()` owns asynchronous setup and returns a running, migrated server; failed setup cleans up its resources and repeated closure is safe.

`RouteBuilder` owns mutable state for one traversal, preventing answers and progress from leaking between calls. Step-specific answer validators act as strategies, selected through exhaustive discriminated matching rather than a loosely typed registry. `FunnelRuntime` is the public facade over domain operations. `FunnelRuntime.Evaluation.evaluate(configuration, variant, answers)` returns `{ route, result }` from one traversal; use it when both are needed. Result eligibility is calculated separately from answered-question progress: missing or rejected optional answers are inactive and do not block a result. These patterns address existing boundaries; repositories, generic base classes, event buses and additional factory layers should be introduced only with a concrete requirement.

## Persistence and event design

The initial Prisma schema provides funnels, immutable configuration versions, publications, sessions, answers, operation receipts, events, and administrator sessions. Foreign keys protect referenced historical records; database constraints enforce unique versions, operations, and event identifiers. Composite version references prevent publications and active pointers from targeting another funnel's version.

Answers are stored separately from events. Event rows contain identifiers, source, timestamps, step, allowed properties, and a content fingerprint. Version, variant, experiment, and acquisition parameters are derived through the pinned session. Wire events include the explicit context required by the assignment.

Application-level immutability, authorization, operation replay, and atomic event/state transitions are planned invariants, not capabilities implemented by the schema alone. The detailed contracts and aggregation definitions are in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Experiment hypothesis and metrics

Hypothesis: variant B increases the share of started sessions opening recommendations through its question sequence and result framing.

The primary metric is distinct sessions clicking the main CTA divided by distinct started sessions. Secondary metrics are result completion and CTA CTR among result viewers. Comparisons are within one version and experiment. Forced assignments are excluded from experiment comparison by default. Synthetic data is marked and supports calculation verification rather than hypothesis validation.

## Diagnostics and failure recovery

The backend writes structured JSON diagnostics to stderr with timestamps and `info`/`warn`/`error` levels. Every request reaching application middleware receives a server-generated `x-request-id`; client-supplied identifiers are replaced. Completion records contain that identifier, the registered route template, method, status and duration. Aborted connections are recorded separately. Body-parser failures are correlated too. HTTP parser failures rejected by Node before middleware do not have an application request identifier.

Application diagnostics omit request bodies, raw URLs/query strings, cookies, authorization headers, error messages and absolute file paths. Errors expose an allowlisted code, a callsite fingerprint and bounded hashed stack locations with line/column numbers. Only exact predefined environment-validation messages are included as `safeMessage`. Fingerprints group matching callsites within the same deployment; keep the matching source/build when reproducing an error locally. They are not substitutes for inspecting code or reproducing the failure.

For a local diagnostic session after building/migrating, from the repository root:

```sh
cd applications/backend
mkdir -p data
umask 077
node distribution/source/main.js 2>data/backend.jsonl
```

With `jq` installed, search a response's identifier or inspect failures:

```sh
jq -R 'fromjson? | select(.requestIdentifier == "REPLACE_WITH_RESPONSE_REQUEST_ID")' data/backend.jsonl
jq -R 'fromjson? | select(.level == "error")' data/backend.jsonl
```

- `application_failed`: inspect `phase`, `error.code` and `error.safeMessage`; `EADDRINUSE` means the configured port is occupied. Correct the cause and restart.
- `readiness_failed`: `migrations_incomplete` requires checking migration status; `database_query_failed` requires checking the safe error code, disk access/capacity and database contention. Liveness remains independent and readiness can recover without restarting.
- `shutdown_deadline_exceeded`: HTTP connections did not drain within ten seconds and were closed. SQLite disconnects after HTTP shutdown. This is a socket-drain limit, not cancellation of synchronous database work.
- `records_dropped`: the log destination applied backpressure. Records were dropped rather than queued without limit. A failed log destination disables further writes; monitor the collector/process stderr externally. Logs are operational diagnostics, not a durable audit ledger.

Production log rotation, retention, disk quotas and supervisor restart policy remain deployment responsibilities. Nest's raw logger is disabled to prevent unsanitized startup exceptions; application lifecycle/error diagnostics use the structured sink. Compressed JSON bodies are intentionally unsupported (415), and unsupported charsets are client errors rather than server failures.

## Security and operating boundaries

Backend startup validates environment settings, binds to loopback by default, limits JSON bodies, uses security headers, applies server timeouts, and redacts public exception responses. Readiness checks the database and expected migration state. There are no exposed administrator or mutation endpoints in this foundation.

SQLite is intended for one backend instance with persistent local storage. Backup/restore, authentication, CSRF protection, rate limits, reliable command retries, and public hosting must be implemented and verified before production readiness is claimed.

Security overrides pin patched transitive dependencies while keeping Prisma 7.10.0. Their advisory rationale and verification are recorded in [the foundation review](documentation/foundation-review.md). Do not run `npm audit fix --force` as a substitute for reviewed compatibility changes.

## Delivery status

The GitHub repository is initially private. No public application URL exists yet. Free hosting with persistent SQLite storage remains to be selected; GitHub Pages can only serve the frontend.

See [the development log](documentation/development-log.md) for actual implementation evidence and [AGENTS.md](AGENTS.md) for mandatory engineering and review rules. The assignment's 48-hour start is not yet recorded.

## Type conventions and module imports

Related operations belong to domain objects, exported whole: `FunnelConfigurations.validate(document)`, `AnswerValidation.validate(step, answer)`, `RouteResolution.resolve(configuration, variant, answers)`, and `ResultResolution.resolve(configuration, variant, answers)`. `FunnelRuntime` groups these same objects for callers using several runtime domains. Standalone method aliases are not exported. All in-repository consumers use the grouped API; objects use `as const` to retain readonly types. Runtime freezing is reserved for shared policy arrays; JavaScript policies use const assertions through checked JSDoc.

Domain policy files own configuration limits and schema constraints, environment defaults, SQLite settings, transport timeouts, numeric tolerances, and readiness settings. Environment inputs use compiled TypeBox/Ajv schemas. Named rules encapsulate condition compatibility and selection constraints. Computed values remain local; message catalogs and policies remain with the subsystem that owns them.

`global-types.d.ts` provides shared types without imports: `Optional<Value>` means `Value | undefined`; `Nullable<Value>` means `Value | null | undefined`; `Maybe<Value>` is a synonym for Nullable. The base TypeScript configuration includes this file through `files`, which remains inherited when workspaces define their own `include` lists. React-specific aliases live in the frontend's `source/ui-types.d.ts`. Use the narrowest alias supported by the existing contract; these are compile-time aliases, not runtime containers or validators. Boundary validation remains TypeBox/Ajv; local predicates use ts-pattern's `isMatching` where that makes the domain check clearer. Authored validation text lives in ConfigurationMessages and AnswerMessages; configured custom answer messages still take precedence.

Backend and shared packages compile using TypeScript NodeNext and execute as Node ESM. A source import such as `./index.js` resolves to `index.ts` during typechecking and remains `./index.js` in emitted JavaScript. Explicit relative extensions are the runtime module contract, not a source-file naming convention. Public package imports such as `@kelpie/contracts` use package exports; Vite's Bundler resolution permits extensionless frontend imports. We retain the existing module strategy rather than adding a runtime loader solely to hide extensions.

These ambient types are a private monorepo convention: generated package declarations rely on the shared root declaration file being included by the consumer's TypeScript program. Before publishing packages independently, package and reference that declaration vocabulary explicitly. Ambient declarations emit no JavaScript; NominalIdentity is a type-level marker and must not be accessed at runtime.

Workspace `tsconfig.json` files cover source, tests, and tool configurations so the editor and `npm run typecheck` use the same strict settings and ambient types. Backend/shared package `tsconfig.build.json` files emit only application/library code into the existing output paths. The root `tsconfig.json` owns JavaScript tooling; `checkJs` is enabled with strict settings and JSDoc types, alongside ESLint. There is no competing jsconfig. VS Code-compatible editors are configured to offer the repository TypeScript version.
