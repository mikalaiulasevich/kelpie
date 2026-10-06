# Foundation engineering review

## Scope

Review covers the application scaffold, configuration contracts/runtime, initial database schema, health endpoints, development startup, and dependency selection. Complete funnel behavior and public production deployment are outside this foundation milestone.

## Follow-up ownership and enforcement review, October 6

The follow-up found additional organizational inconsistencies despite earlier green checks: SQL embedded in migration operations, reusable database/health/context contracts embedded in implementation modules, and newly introduced test fixtures mixing several resource owners with policy/messages/types. These were moved to explicit owners and consumers migrated without compatibility aliases. Test scenarios and behavioral expectations were preserved.

AGENTS.md now defines a required workflow for every coding request: inspect current work, search analogous violations, maintain encountered code within the authorized scope, review the final diff, exercise relevant failures and report evidence precisely. Existing narrow/read-only requests retain their edit boundaries. This is the repository contract, not a background automation.

Scoped ESLint guards now reject direct literal/template arguments to the named built-in error constructors in source/tooling, direct inline arrays passed to each, Messages declarations in policy modules, and production imports from test directories. Five in-memory negative probes were rejected and a domain-message positive probe passed. The guards intentionally recognize syntax rather than prove semantic ownership; aliases, differently named catalogs and equivalent syntax still require review. An independent reviewer checked override ordering and documented limits.

The final full npm run verify passed 189 unchanged cases plus types, lint, formatting, clean builds, supplied configuration integrity, test layout and Prisma validation. No new behavioral feature, dependency or performance improvement is claimed. Private single-component property interfaces and private traversal-state types remain local; schema-derived aliases stay with canonical schemas when appropriate. Those are deliberate cohesion choices, not unreported failed migrations. This pass does not establish that every possible violation or defect has been eliminated.

## Security, resilience and diagnostics review, October 6

Reviewed the implemented foundation separately for input handling, privacy, database failure behavior, process lifecycle and diagnostic usefulness. Independent review found no additional material blocker after the corrections below; this is not a penetration test or proof of production readiness.

| Finding                                                     | Correction and evidence                                                                                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unsupported request encodings were mapped to server errors  | Preserve parser 415; reject compressed JSON before inflation; integration cases cover charset/compression and existing malformed/oversized payloads    |
| Startup exceptions could abort outside controlled handling  | Nest abortOnError is false; subprocess tests verify invalid settings and occupied ports exit nonzero with safe diagnostics                             |
| Errors lacked correlation and useful failure categories     | Server-generated request UUID, structured severity/events/timing, safe codes/fingerprints, explicit readiness reasons and startup phases               |
| Logging could expose payloads or grow memory under pressure | Allowlisted fields/messages, hashed bounded frames, tested multiline/accessor redaction, bounded stream backpressure with drop accounting              |
| HTTP shutdown could wait for stalled connections            | Ten-second connection drain deadline; real partial-body/SIGTERM test verifies forced close and process exit; database disconnect follows HTTP disposal |
| Development wrapper exit could leave orphan processes       | POSIX group tracking survives leader exit; external reproduction changed two surviving descendants to none, including descendants ignoring SIGTERM     |

Full Node.js 24 verification passed 189 cases (74 backend, 5 frontend, 59 contracts, 51 runtime), strict TS/JS checks, lint, formatting, clean builds, original configuration integrity, test placement and Prisma validation. Backend tests include concurrent request correlation, client-ID replacement, log privacy, database failure/recovery, logger backpressure/error handling, startup failures and real shutdown. npm audit reported zero known vulnerabilities across 561 dependencies. No dependency was added.

Operational limits remain explicit: SQLite's synchronous five-second busy wait can block the event loop under external write contention; the HTTP drain timer does not interrupt synchronous work. Log delivery is best-effort: a failed destination disables writes and backpressure drops records. Deployment must provide supervision, log rotation/retention/quotas, persistent storage and tested backups. Windows descendant cleanup was not verified. Authentication, CSRF, rate limits, command idempotency and analytics remain future feature/deployment checks rather than implemented capabilities. Node-level HTTP parser rejection precedes application correlation. See README for request-ID searches and failure triage.

## Pre-feature consistency review, October 6

Completed three passes: domain inventory and corrections; a second review of the changed modules; independent cross-domain review and integrated verification. Scope includes authored source, test suites/support, compiler and tool configurations, scripts, Prisma schema and current documentation. Supplied documents remain checksum-protected; generated files and dependencies are not hand-edited.

- Contracts: configuration compiler moved to its owning domain; reusable types moved out of operation modules; event/result checks split into ordered phases with preserved diagnostics.
- Runtime: consistent collection vocabulary, domain-owned result types, reusable answer fixtures and named experiment cases. Traversal and evaluation algorithms are unchanged.
- Backend: schema-derived environment types, cleanup after failed startup, explicit body-parser status allowlist, fixture lifecycle guards and preservation of simultaneous setup/cleanup failures.
- Frontend/tooling: separate content/messages/settings, grouped response predicate, consistent static policy naming, checked JSDoc const assertions instead of unnecessary object freezing, script error catalogs. Prisma formatting changed whitespace only.
- Tests: domain directories, fresh fixtures, independent expected contract values, two additional setup/cleanup failure regressions. Cross-review caught and corrected lost setup errors when fixture cleanup also failed.

Final integrated Node.js 24 verification passed 170 cases (55 backend, 5 frontend, 59 contracts, 51 runtime), strict TypeScript/JavaScript checking, ESLint, formatting, clean builds, original configuration checksums, test placement and Prisma validation. The Prisma formatter produced no whitespace-insensitive schema diff. Earlier counts and timings below describe previous milestones.

The final local microbenchmark (Apple M4, Node.js 24.16.0, 12 scenarios, seven samples) measured median samples of 192.474 ms per 1,000 configuration validations, 89.921 ms per 10,000 route resolutions and 205.994 ms per 10,000 result resolutions. These measurements confirm the benchmark still runs after tooling cleanup; they are not a server throughput or optimization claim.

Security and complexity review preserved own-property access, bounded validation, short-circuit predicates, per-call route state and redacted startup responses. SQL constraints remain covered by integration tests. End-to-end operation idempotency, authorization, publication and analytical aggregation still belong to the upcoming feature implementation; this review does not claim those features, production readiness, new remote CI results or browser visual acceptance. The new fault-injection tests cover fixture failure handling; process-level startup cleanup was reviewed but not separately fault-injected.

## Earlier whole-codebase review, October 6

Reviewed authored source, tests, type declarations, package/compiler configuration, Prisma schema/migration, scripts, workflow, and current documentation. At that milestone, inventories contained 35 contracts files, 24 runtime files, 32 backend files, 20 frontend files, and four scripts, plus root tooling/documentation. Generated code and dependencies were not manually polished; original JSON fixtures remain checksum-protected. Independent domain reviews were integrated and the resulting changes inspected together.

| Finding                                                                   | Resolution                                                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Semantic validation mixed unrelated phases in one 391-line module         | Ordered orchestration, domain validators, per-call diagnostic context and variant traversal |
| Answer validation mixed formatting, numeric rules and selections          | Separate domain operations with bounded selection validation                                |
| Sparse selection arrays bypassed Array.every checks                       | Explicit bounded iteration; regression rejects missing array slots                          |
| Database lifecycle duplicated directory preparation and readiness queries | Shared SQLite preparation, migration owner, one readiness query                             |
| Error-path and migration-completeness coverage was incomplete             | Malformed JSON redaction test and five migration-state cases                                |
| Readiness state rendering was embedded in the application shell           | Dedicated connection component and exhaustive state rendering                               |
| JS tooling was outside strict type checking                               | checkJs enabled, JSDoc contracts and checked collection access                              |
| Vite defaults were duplicated in the npm command                          | Development command uses the existing Vite configuration                                    |
| Documentation mixed initial results with current state                    | Historical evidence labeled; completed tooling decisions updated                            |

At that milestone, full Node.js 24.16.0 verification passed 145 tests (52 backend, 4 frontend, 56 contracts, 33 runtime), strict TS/JS checks, lint, formatting, builds, fixture checksums and Prisma validation. A 584-input differential comparison preserves configuration acceptance and exact diagnostic order/path/text. A local development-launcher smoke check confirms SIGTERM cleanup and sibling termination on failure, including exit status. Windows process-tree shutdown was not exercised.

The same 12-scenario benchmark on Apple M4 reports median samples of 186.154 ms/1,000 validations, 88.212 ms/10,000 routes, and 202.975 ms/10,000 results. Typed benchmark assertions add small work inside measured callbacks, so these remain approximate local comparisons, not an optimization claim. Frontend JavaScript is 82.34 kB gzip (previously 81.92 kB); exhaustive presentation matching adds a small bundle cost. No new dependency was added.

The configuration boundary expects parsed JSON; arbitrary JavaScript accessors/proxies can still execute or throw during enumeration. Runtime operations assume validated configurations. Session authorization, transactional publication, event retry semantics and analytics cannot be verified as implemented behavior because their application layers remain pending. This pass does not claim production readiness, browser visual acceptance, or a new remote CI result.

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

## Initial foundation verification (historical)

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

## TypeBox and ts-pattern migration verification

On October 6, the final Node.js 24.16.0 verification passed 82 tests and the added compile-time contract regressions. TypeBox 1.3.36 owns structural schemas and ts-pattern 5.9.0 provides exhaustive dispatch. Bounds checks still precede Ajv; closed objects, own-property lookup, privacy allowlists, and immutable input handling remain enforced. Recursive condition types use explicit edges to avoid upstream recursive inference widening. Base screen requirements are checked structurally, with the same schemas used for merged variant content. Historical configurations retain their acceptance behavior; structural error formatting is not byte-identical.

The pure-function benchmark on the same Apple M4 / Node.js 24.16.0 used 12 scenarios and seven samples. The previous pass versus final migration medians were:

| Operation                | Operations per sample |    Before |     After |
| ------------------------ | --------------------: | --------: | --------: |
| Configuration validation |                 1,000 | 53.710 ms | 59.206 ms |
| Route resolution         |                10,000 |  7.107 ms | 35.967 ms |
| Result resolution        |                10,000 | 12.218 ms | 75.781 ms |

Pattern matching introduces a measurable constant-factor cost in this workload. At that milestone, simple recursive guards were retained to reduce it; the later all/any matching pass below superseded that choice. Final route/result costs average approximately 3.6/7.6 microseconds per operation within each median sample; these figures are not application throughput measurements. No claim of a 30–40% total code reduction or performance improvement is made. If production throughput requires it, a separately measured immutable-configuration compilation approach should be evaluated rather than adding an unbounded or stale-prone cache.

The subsequent requested all/any matching and predicate pass measured 58.532 ms / 1,000 configuration validations, 51.155 ms / 10,000 route resolutions, and 129.511 ms / 10,000 result resolutions on the same benchmark. This is approximately 5.1/13.0 microseconds per route/result operation and slower than the preceding pass. No claim of performance improvement is made; input bounds, algorithmic complexity, short-circuit semantics, and prototype isolation remain covered. Optional/Nullable/Maybe are compile-time aliases and add no runtime allocation. No new dependency was introduced in this pass.
