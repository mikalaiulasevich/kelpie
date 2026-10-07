# Foundation engineering review

This document explains current foundation decisions and their evidence. Feature scope and acceptance gates belong to [the implementation plan](../IMPLEMENTATION_PLAN.md); actual milestones belong to [the development log](development-log.md). The [file inventory](file-audit.json) records current paths and hashes; it is not a claim that every line was re-reviewed in the latest pass. Earlier review chronology remains in Git; raw benchmark reports remain in this repository.

## Implemented boundaries

- **Configuration contracts:** TypeBox schemas with once-compiled Ajv validation; bounded preflight precedes structural and semantic checks. Explicit recursive type edges retain readonly condition safety. Original configuration bytes are checksum-protected.
- **Pure runtime:** domain operations handle answers, conditions, variants, routes, progress and first-match results. `FunnelRuntime.Evaluation.evaluate` returns route and result from one traversal. `RouteBuilder` and validation contexts keep mutable state local to one call.
- **Backend composition:** `ApplicationFactory` receives one validated environment snapshot. SQLite schema constraints protect references and unique identifiers. Health/readiness, safe diagnostics and lifecycle disposal are implemented; schema constraints alone do not establish application-level authorization or replay semantics.
- **Frontend transport:** Ky preserves cancellation, disabled retries, same-origin credentials, no-store caching and a five-second total deadline. Exhaustive rendering preserves typed ready-state access; react-if handles conditional presentation.
- **Tests:** real temporary SQLite migrations and backend startup complement pure tests, frontend transport mocks and compile-time regressions. Fixtures attempt teardown after setup/test failure and preserve primary and cleanup errors.

The configuration boundary assumes parsed JSON. Accessors or proxies supplied directly as arbitrary JavaScript objects can execute or throw during enumeration. Runtime evaluation assumes prior configuration validation. Session confirmation of reopened answers remains a command-layer responsibility.

NodeNext packages retain `.js` import specifiers for emitted ESM; Vite uses Bundler resolution. Root ambient utility types are a private monorepo convention: independent package publication would need to package that vocabulary explicitly. Bun migration is pending; current backend execution and SQLite adapter are Node-based.

## Retained and rejected simplifications

| Decision                                                                                  | Reason                                                                                                                                     |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Keep exhaustive step-override branches                                                    | A generic union spread loses discriminant/content correlation; `Object.assign` masks it through intersections                              |
| Share route/result evaluation                                                             | Avoids a second route/answer-validation pass when callers need both                                                                        |
| Reuse selection indexes per validation                                                    | Avoids repeated Set construction without cross-call invalidation; mutation-between-validations regression protects freshness               |
| Use `mapValues` for resolved dictionaries                                                 | Preserves own enumerable keys and expresses transformation directly                                                                        |
| Use exact toolkit guards, `memoize`, `difference`, `once`, `omit`, `identity`, `isSubset` | Removes equivalent manual operations; installed source/types were inspected, diagnostic ordering and mutation behavior tested              |
| Retain native own-property and finite-number checks, bounded selection iteration          | Preserve prototype isolation, noncoercion, sparse-array rejection and early size rejection                                                 |
| Reject toolkit `isPlainObject` replacement                                                | It accepts additional prototype/object forms, widening the input boundary                                                                  |
| Reject blanket `uniq`/`difference`/`range` rewrites                                       | Extra collections or full scans do not improve already clear native operations or short-circuit hot paths                                  |
| Reject lazy diagnostic-message abstraction                                                | Trial timing did not justify longer call sites and another generic method                                                                  |
| Reject Mnemonist for production                                                           | Ordinary valid selection and cache workloads had no stable gain; Stack was slower; duplicate-only improvement did not justify a dependency |

Toolkit `memoize` has one cache per validation context, keyed by step identity. `difference` retains order/duplicates but allocates temporary Sets/lists; migration `isSubset` also allocates a difference list. `once` marks completion before invocation, including when the callback throws. `isError` is exactly `instanceof Error` in the pinned version. These are compatibility decisions, not claims that library syntax is always faster.

The completed Mnemonist harness/dependency was removed. [Its comparison table](benchmarks/mnemonist-comparison.csv) and raw reports remain; Git revision `3387d9520f4321d562bb5c1d019e294ae96990a2` preserves the runnable experiment. Native Array/Set/Map remain where appropriate.

## Security and operational limits

| Boundary                    | Evidence or limitation                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input handling              | Depth/node/size limits, reserved-key rejection, own-property references, body limits; unsupported compression returns 415                                     |
| Diagnostics                 | Server-owned request identifiers, redacted public errors, bounded hashed reporting-site locations, allowlisted codes/messages; supplied stacks are never read |
| Startup failure             | Subprocess tests cover invalid environment and occupied ports; Nest `abortOnError` is disabled so controlled failure handling runs                            |
| Shutdown                    | Real partial-body/SIGTERM regression covers the ten-second HTTP drain deadline and database disposal afterward                                                |
| Log backpressure            | Bounded drop accounting; a failed destination disables writes. Deployment must supervise collection and retention                                             |
| Development process cleanup | POSIX process-group cleanup was exercised, including descendants ignoring SIGTERM; Windows behavior is unverified                                             |
| SQLite contention           | The synchronous five-second busy wait may block the event loop; the HTTP drain timer cannot cancel synchronous database work                                  |

No production-readiness or penetration-test claim follows from these checks. Pending security and delivery controls are tracked in the implementation plan. [README troubleshooting](../README.md#diagnostics-and-troubleshooting) provides operational commands.

## Dependency decisions

Keep reviewed transitive overrides while Prisma remains at its selected version:

| Package      | Pinned override | Original rationale                                                        |
| ------------ | --------------- | ------------------------------------------------------------------------- |
| deepmerge-ts | 8.0.2           | Recursive graph stack exhaustion in Prisma configuration tooling          |
| mysql2       | 3.24.5          | Authentication downgrade and decompression issues in a tooling dependency |
| shell-quote  | 1.12.0          | Command injection in development process tooling                          |

Advisory references: [DeepmergeTS](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), [MySQL authentication](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr), [MySQL decompression](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3), [shell-quote](https://github.com/advisories/GHSA-pqg4-j6r4-53mv). This records the override rationale, not a fresh advisory audit. The deepmerge-ts override crosses a major version: changes require Prisma configuration/generation/schema/migration and integration checks. These tooling dependencies do not imply an exposed MySQL service.

Unused `@nestjs/testing` was removed from the backend manifest and both lockfiles. Pinned npm 11.19.1 still reports five missing transitive dependencies under optional `@tailwindcss/oxide-wasm32-wasi` during `npm ls --all --package-lock-only`. The earlier isolated npm installation and installed-tree check passed; the WASM path has not been verified. Bun frozen lockfile validation checks dependency consistency only, not backend runtime compatibility.

## Benchmark method

Run `npm run benchmark:runtime` alone on an idle machine. It rebuilds production packages and verifies all 79 scenarios before warmup and after measurement. Setup and expected-output checks are outside timing; 200 warmup calls precede nine batches with rotating scenario order. Compare repeated runs with the same environment and workload.

[Latest CSV](benchmarks/latest.csv), [append-only history](benchmarks/history.csv) and timestamped JSON preserve samples, iteration counts, Node/V8/CPU details, Git revision and source/compiled hashes. Source/build changes during a run reject it. JSON is authoritative if a derived-table write fails. Use the npm command: direct runner invocation bypasses rebuilding.

Reported medians/minima/maxima are **batch-average time per operation**, not request latency percentiles. The suite excludes network, SQLite, startup and complete application throughput; it does not measure heap allocation or peak memory. Complexity below is static analysis. Do not introduce shared-CI timing thresholds or infer scalability from these samples.

Cases vary steps/options, selection count, condition depth/membership, result-rule position, missing/invalid answers and branches; original v1/v2/v3 A/B behavior is checked. Add measurements only for implemented hot paths.

## Recorded measurements

The latest paired toolkit review used Node.js 24.16.0 / Apple M4 and all 79 scenarios:

| Configuration operation       | Size | Before, µs/op | After, µs/op | Repeat, µs/op |
| ----------------------------- | ---: | ------------: | -----------: | ------------: |
| Valid configuration           |    8 |       103.554 |      104.816 |       104.126 |
| Valid configuration           |   32 |       261.268 |      262.956 |       257.117 |
| Valid configuration           |   96 |       673.186 |      673.503 |       660.460 |
| Repeated selection references |   96 |       465.773 |      465.773 |       458.948 |

Raw evidence: [baseline](benchmarks/2026-10-06T19-18-03.290Z-e24d030d-582c-423e-90d5-ebf78d23efb0.json), [candidate](benchmarks/2026-10-06T19-20-46.490Z-208b2caa-25c5-4971-8ed9-17b599e1df4b.json), [repeat](benchmarks/2026-10-06T19-21-44.723Z-12554e2b-68ae-442f-b18b-38bef0d4981e.json). No repeatable material regression was observed; this does not establish a speedup or statistical equivalence.

Earlier retained optimizations have separate comparable measurements:

| Change / operation                            | Before, µs/op | After, µs/op | Repeat, µs/op |
| --------------------------------------------- | ------------: | -----------: | ------------: |
| Dictionary transformation, 96-step experiment |         9.436 |        3.657 |         3.592 |
| Runtime allocation cleanup, 96-step route     |        72.023 |       63.150 |        62.876 |
| Same cleanup, complete evaluation             |        72.755 |       63.664 |        63.310 |
| Same cleanup, numeric answer                  |         0.473 |        0.375 |         0.383 |

Dictionary evidence: [before](benchmarks/2026-10-06T18-35-35.170Z-b942ae99-bbae-4208-8ed9-93e136963591.json), [after](benchmarks/2026-10-06T18-36-01.875Z-6c8ee471-18d9-4e1a-ab93-a85f7d9a536a.json), [repeat](benchmarks/2026-10-06T18-36-35.154Z-f9e8911e-61c0-46dc-89fa-9617a6fd201b.json). Runtime evidence: [before](benchmarks/2026-10-06T18-43-35.410Z-74d581b4-11ac-495b-8ea3-bf2b78f9b775.json), [after](benchmarks/2026-10-06T18-44-51.732Z-0ec9b8ce-74e1-4a24-aead-6f25c1aeaf26.json), [repeat](benchmarks/2026-10-06T18-46-18.838Z-0a96af05-bf95-40fa-a01f-83a7b7f2134d.json). These are separate local experiments, not cumulative speedup claims or current latency promises.

## Complexity

These bounds come from the current implementation, not timing samples. They describe one call with an already parsed configuration and exclude module loading, Ajv compilation, JSON parsing, network transport and database work. Dictionary/Set/Map lookups use expected constant-time accounting; this is not a JavaScript-engine worst-case guarantee. String comparisons and hashing can inspect the string length. The table treats validated identifiers as bounded strings; unvalidated answer strings must not be assumed to have the same length bound.

Parameters:

- `S`: steps in the selected variant sequence; `V`: visible steps; `T`: all configured steps; `R`: configured results.
- `O`: options for one selection step; `A`: submitted selections. Subscripted sums include only answers actually validated. Oversized arrays are rejected before inspecting their elements.
- `C`: visited condition nodes; `D`: maximum visited condition depth; `M`: total elements inspected by `in` operand searches and `contains` answer searches. Short-circuiting can reduce both `C` and `M`.
- `Q`: result rules inspected before the first match, or all rules when none matches. Condition work for visibility and result rules is counted separately when needed.
- `N`: properties/values in the document; `B`: serialized document bytes; `W`: largest container width. The bounds walker accounts string lengths conservatively; its estimate is not exact serialized byte size.

| Operation                            | Time per call                                                               | Additional peak memory                        | Relevant behavior                                                                                                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Numeric answer validation            | `O(1)` with bounded diagnostic text                                         | `O(1)`                                        | Fixed arithmetic and at most three accumulated issues; fallback formatting is currently eager.                                                                               |
| Single-selection answer validation   | `O(O)`                                                                      | `O(1)`                                        | Stops at the first equal option. An unavailable value or last option exercises the full scan.                                                                                |
| Multiple-selection answer validation | Expected `O(O + A)`                                                         | `O(O + A)`                                    | Builds option and selected-value sets on each call. A non-array or `A > O` is rejected in constant work.                                                                     |
| Condition evaluation                 | `O(C + M)`                                                                  | `O(D)`                                        | Traverses only visited branches; array membership is a scan, not a set lookup.                                                                                               |
| Route resolution                     | Expected `O(S + C_visibility + M_visibility + sum(O_i + A_i))`              | `O(V + acceptedAnswers + max(O_i + A_i) + D)` | Numeric validations contribute constant work per step. Shallow overrides copy a bounded number of fields; answer arrays and content strings are referenced, not deep-cloned. |
| Next/previous step                   | `O(V)`                                                                      | `O(1)`                                        | Each call uses `findIndex`. Navigating every step by repeatedly calling it can take `O(V²)` total.                                                                           |
| Result resolution                    | Route cost plus `O(Q + C_results + M_results)`                              | Route memory plus `O(D)`                      | Public result resolution constructs the route first; an incomplete route skips result rules. First-match priority is preserved.                                              |
| Combined funnel evaluation           | Same bound as result resolution                                             | Same bound as result resolution               | Returns route and result from one traversal. Calling separate route and result entry points repeats route work.                                                              |
| Experiment resolution                | `O(T + R)`                                                                  | `O(T + R)`                                    | Iterates all configured steps/results, not just the selected sequence; output is shallow.                                                                                    |
| Document bounds inspection           | `O(N)` on a fully visited plain JSON tree, subject to string-key accounting | `O(N + W)`                                    | Uses a pending stack, visited-object set and temporary key/entry arrays. Rejection may occur before all values are visited.                                                  |

Full configuration validation is **not claimed to be linear in bytes**. After document inspection it runs the once-compiled Ajv validator and semantic checks. Ajv cost depends on schema alternatives, string validation and uniqueness checks; measure that complete boundary independently. For semantic validation, include steps/options, both variant sequences and override dictionaries, result rules, event properties and every condition occurrence. Selection option sets are indexed once per step within one validation context and reused by operand checks. Their work is `O(total configured selection options + total operand visits)`, with retained memory proportional to those options for that call. The same visibility condition can be visited in both variants. The 30-issue cap bounds retained diagnostics, not semantic traversal time.

Current policy limits are 262,144 conservatively estimated document bytes, 20,000 visited nodes, document depth 24, 100 steps per variant, 100 options per selection and 100 result rules. Limits bound accepted workloads; they do not justify calling every operation constant-time. In particular, the bounds walker obtains `Object.keys` before checking container width, and obtains all entries before processing them. An already allocated oversized JavaScript object still incurs enumeration work proportional to its width. Parsed HTTP input additionally needs the transport body limit. Getters and proxies are outside the plain parsed-JSON assumption.

A route-position index would help repeated navigation over one resolved route, but costs O(V) to construct and is unnecessary for current single lookups. Preserve diagnostic order, short-circuit behavior, caller isolation and type narrowing in further optimization.

## Conformance with the implementation plan

The review distinguishes existing behavior from unimplemented product milestones:

| Existing boundary           | Correction or verification                                                                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Active answers and progress | Empty optional answers remain inactive and do not complete a question; required empty answers still block results.                                                                  |
| Diagnostic privacy          | Diagnostics capture a server-owned reporting-site stack; supplied stacks are never read. Regression cases cover multiline messages, cached metadata changes and throwing accessors. |
| Operation ownership         | SessionOperation uses a composite session/operation primary key; duplicate identifiers in different sessions do not conflict.                                                       |
| Shutdown                    | The development supervisor now permits 15 seconds, exceeding the backend's 10-second drain deadline. POSIX process probes covered delayed graceful exit and forced termination.     |
| Development proxy           | README states that a custom backend HOST/PORT requires updating the Vite proxy target.                                                                                              |

Migration `20261006000200_session_operation_scope` copies existing operation rows within a transactional SQLite table rebuild; the original migration is unchanged. An isolated SQLite upgrade probe preserved fingerprints, responses and timestamps, including rollback after an injected rebuild failure. Normal application tests apply all migrations to fresh temporary databases. Apply the new migration to an existing development database with `npm run database:migrate` before expecting readiness; this review does not migrate private local databases automatically.

Session creation, stable assignment, confirmation revisions, transition history and replay snapshots are implemented. Historical observation eligibility checks, mixed event ingestion, session-based analytics, traffic generation and public delivery remain pending. Administrator authentication and publication/rollback APIs are implemented. This review does not claim full assignment coverage or Bun runtime acceptance.

## Fastify transport

NestJS uses the official Fastify adapter with native hooks and `@fastify/helmet`. JSON bodies are bounded to 256 KiB and must contain an object or array; unsupported media types, non-UTF-8 charsets, compressed bodies and prototype-poisoning keys are rejected. Security headers and server-owned request identifiers also cover rejected requests. Native Fastify logging stays disabled; request hooks use the shared Pino diagnostics sink without exposing raw requests or duplicating access records. Trusted-proxy handling stays disabled until a deployment topology is defined.

Startup uses immutable acquisition results (`attemptAsync`) and separate creation/listening failure boundaries. Cleanup receives the resource owned by that stage; no optional application placeholder or mutable diagnostic phase coordinates the catches. Tuple handling checks the non-null application result, so null/undefined rejections still fail and release the adapter.

Real HTTP integration tests cover parser rejection, accepted JSON through routing, health/readiness, concurrent correlation and redacted failures. Subprocess tests cover startup failures, port release and bounded shutdown with an incomplete request. This migration does not establish a throughput improvement or Bun runtime compatibility.

## Configuration draft persistence

Backend iteration 1 introduced a local import command; iteration 3 exposes the same immutable import boundary through administrator-protected HTTP. Draft identity is `(funnelIdentifier, version)` plus a SHA-256 checksum of canonical JSON. Object property order is ignored; array order remains meaningful. Validation and a detached document snapshot precede asynchronous persistence. Funnel creation and version insertion commit together; uniqueness conflicts resolve by reading and comparing the committed version. No existing document or active pointer is updated.

File reads are bounded to the shared 256 KiB limit; streams cannot grow unbounded after the size check. File handles use scoped asynchronous disposal. Errors expose bounded validation issues or redacted diagnostics rather than raw file contents and filesystem paths. The CLI requires local database access and migrations; HTTP imports use the administrator guard. Canonicalization costs `O(N + sum(k log k))` for JSON nodes N and each object's k keys, with `O(N)` snapshot/storage space; configuration bounds cap work before persistence. No throughput claim is made.

Thirteen real SQLite import tests cover supplied versions, invalid input, replay, conflicting content, concurrent identical/conflicting imports, caller mutation and transaction rollback after a SQLite trigger abort. Six file-boundary tests verify size limits, growth after stat, parsing and actual descriptor release. A separate CLI smoke used a disposable migrated database: root-command import, stable replay, conflict/usage exit codes and no activation/publication all passed. No private development database was modified. CLI failure rendering now has a typed domain owner, exact message allowlisting and accessor-failure containment (five additional tests). Canonical JSON normalization uses `isPlainObject` to exclude null explicitly; workspace typechecking passes without casts or suppressions.

## Repository ownership and readability review

Configuration imports, administrator access and publication management were reviewed together. Shared management schemas, bounded query parsing, funnel lookup and page construction now have one owner; configuration management no longer depends on publication types, routes or messages. Publication request/response schemas are grouped with derived contracts, separate from compiled input validation. Configuration identity extraction is reused for insertion and metadata verification. Exhaustive error-code maps replace fallback status/message branches.

Password encoding owns decode/dummy material while verification still performs the same bounded derivation for malformed hashes. Credential primitives are captured before asynchronous work; a real HTTP regression mutates the caller-owned request during verification. Both CLI commands share one lifecycle runner that preserves primary and cleanup failures, closes once and emits results only after shutdown. Six lifecycle tests use real Nest/SQLite resources. Additional publication cases reject corrupted checksums and version/schema metadata.

Class-member and independent-export spacing is lint-enforced across all four workspaces; intentionally malformed probes were rejected in each workspace. These changes preserve transport contracts, transaction order and query count; they do not establish a performance gain. The subsequent repository-wide pass inspected backend infrastructure/tests, both shared packages including benchmark code, frontend, scripts and workspace settings. Independent review checked the changed error boundary and recursive schema wiring; this is review evidence, not proof of defect-free code.

The package review grouped internal condition, step, result and configuration schemas under named owners. Independent serialization comparisons matched the previous root schema exactly, including recursive references and alternative ordering. Runtime algorithms and benchmark measurement code were retained where simplification would widen semantics or add work; no new performance claim or benchmark run follows from this pass.

Backend parser-error classification now reads arbitrary error-code accessors inside a guarded boundary and uses a prepared allowlist lookup; a real HTTP regression verifies safe 500 output and diagnostics after a throwing getter. Shared database-error recognition removes duplicated uniqueness checks; health response types derive from their schema. Frontend health rendering no longer rechecks a state already narrowed by exhaustive matching, and its implementation-status copy reflects available publication APIs. Integrity tooling validates manifest structure/count before reading configuration files; isolated subprocess probes covered malformed manifests, changed contents and cleanup allowlists. The root provisioning command now prepares generated dependencies consistently with configuration import.

## Administrator access and activation transactions

Administrator sessions use opaque random tokens stored only as SHA-256 hashes. Cookie scope, HttpOnly, SameSite=Strict and production Secure flags are verified through real HTTP tests; browser/TLS acceptance remains pending. Exact Origin plus a custom mutation header provides CSRF protection with no CORS enabled. Sign-in has a bounded IP cache and one asynchronous scrypt operation in flight per application instance (OWASP fallback parameters N=131072/r=8/p=1). Unknown users still perform derivation; invalid credentials are generic. There is one active administrator session. Credential rotation revokes sessions transactionally, and sign-in rechecks the password hash after derivation before creating a session. New sign-in removes preceding session records; this is not a persistent login audit history.

Publication intent fingerprints include administrator, action, funnel, target and expected revision. An authenticated exact retry resolves before revision checking and returns the stored original response. Active pointer CAS and publication insertion commit together. Rollback reads the previous activation, not a numeric version predecessor; target documents and metadata are revalidated. The revision migration is transactional, preserves legacy rows, orders timestamp ties by insertion rowid and maintains the current revision floor. Session rows are untouched by activation. HTTP acceptance now verifies old-session continuation across publication and rollback.

New tests use real HTTP and SQLite for cookie authorization, expiry/revocation, CSRF, rate limits, v1-v3 imports, publication/rollback/replay, simultaneous duplicate/conflicting commands, stale revisions, stored-document corruption and transaction failure. Three migration regressions preserve existing sessions, answers, operations and analytics records. A separate provisioning subprocess smoke on a disposable migrated database passed missing-secret rejection, password hashing, credential rotation, session revocation, private-output checks and clean exit. Private local databases were not migrated.

Command query count is constant; unique indexes locate operation receipts and revisions. Per-command document preparation retains the bounded canonicalization cost described above. History/configuration lists use indexed ordering and at most 101 fetched metadata records with offset capped at 10000 (`O(log V + offset + limit)` index traversal, bounded output space). Offset pages can shift between requests; use keyset pagination before extending limits. No new throughput or latency improvement is claimed. Password hashing intentionally consumes about 128 MiB per in-flight operation; the 256 MiB library limit is a ceiling, not a measured process memory total. Proxy trust, multi-instance coordination and deployment-specific capacity remain outside this milestone.

## Session ownership and commands

Backend iterations 4 and 5 establish signed browser ownership before creation, transactional active-version and A/B pinning, immutable acquisition UTM, and server-authoritative answer/Continue/Back commands. Authentication and expiration precede sensitive replay; identical intents return their original response before revision checking. Changed intents and stale revisions are distinct conflicts. Successful commands atomically write answers, confirmation changes, revision, replay response, transition and authoritative events. An actual SQLite event-insert failure proves rollback and successful retry, rather than merely mocking the transaction API.

A bootstrap cookie is valid for 72 hours while unbound. Creation renews its browser lifetime without replacing the credential; after bootstrap expiry, a correctly signed credential remains valid only when bound to an unexpired session. The signing key persists in ApplicationSecret and must be protected with the database and backups. A fresh Nest instance on the same database accepted an existing cookie; this is not an operating-system process restart or TLS/browser proof. Cookie expiry, tampering, cross-owner access, CSRF, concurrent creation/answers and authorization before replay have HTTP regressions.

Hidden answers retain their values but lose confirmation. Reopened answers cannot affect downstream routing/results until explicitly confirmed again. Tests cover A/B routes, v3 continuation after rollback, optional null answers, distinct step/input names and rejected-command isolation. The additive migration preserves legacy values and analytics; old answers start as unconfirmed drafts and old sessions gain a nullable initial snapshot. Transition revisions are unique per session and their operation references use a compound foreign key.

Server events contain bounded properties and never raw answers. Version, variant, experiment and UTM belong to the immutable session/version relation and are joined when projecting event metadata. Information Continue is a forward transition without an invented interactive completion event. Client observations, batching and analytics are separate upcoming work.

Commands perform a fixed number of indexed database operations, with bounded configuration/answer traversals and a map-based invalidation pass. Pinned configuration validation runs once per command transaction and is reused by routing and response projection. State evaluation still runs against the initial and resulting answers. Back and information Continue avoid the answer-stage database reload; no measured throughput improvement is claimed. Replay snapshots duplicate configuration and answer state, so storage grows with accepted operations. Sensitive-data expiration cleanup and compact historical eligibility storage remain pending; access expiration is enforced now. SQLite remains a single-instance deployment target. Browser draft persistence and first-open tab coordination are frontend work.

## Structured logging

Pino 10.4.0 owns serialization, ISO time and level filtering. A bounded destination adapter retains the existing drop-on-backpressure policy, one drain summary and terminal disabling of a destination after either synchronous or asynchronous write failure. Recovery requires replacing the failed destination or restarting the process; ordinary backpressure resumes on drain. No worker transport or independently buffered file destination is introduced. Request correlation remains server-owned AsyncLocalStorage state. The Nest LoggerService bridge and CLI errors share the sink; CLI result JSON remains separate stdout output. LOG_LEVEL is validated through the environment schema. Redaction paths provide defense in depth; typed producers and allowlisted metadata remain the primary privacy boundary, not a claim of recursive secret discovery.

Tests cover six levels, runtime threshold changes, correlation, sensitive fields, stream failures, safe framework context/arguments, and valid/invalid LOG_LEVEL values. ESLint forbids console calls in backend source; a deliberately violating stdin probe was rejected. Three additional CLI regressions prove revoked proxies and throwing domain-error accessors cannot replace the original failure with a diagnostic exception. The real CLI import/replay/conflict smoke also passed with Pino, preserving stdout results and exit codes. Logs are best-effort, not a durable audit trail, and no performance improvement is claimed.

## Cross-module maintenance after session delivery

The review covered backend ownership/commands, administration, publication, configuration import, transport, lifecycle, SQLite and diagnostics; shared contracts/runtime and their fixtures; frontend readiness; and root tooling/configuration. This is a scoped maintenance pass over the existing product, not implementation of event ingestion or analytics.

Session schemas and compiled validators now have cohesive named owners. Their serialized public schemas were compared before/after grouping and remained identical. Session commands reuse one transaction-local validated configuration while recomputing answers/routes after writes. No mutable global runtime cache was added. Administration validation rejects inherited credentials, and shared credential schemas/identity projection remove duplicated mappings. Diagnostic metadata is read once per report so accessor-backed errors cannot produce inconsistent repeated reads; throwing accessors remain contained. Allowlisted message arrays are computed once per module.

Shared schema fields and screen-content requirements were consolidated; document-bound test setup moved into fresh fixtures. Native bounded membership scans, sparse-array handling and early exits remain because a toolkit pipeline would obscure semantics or add allocation. The frontend was inspected and required no forced refactor. Existing public naming and original configuration bytes remain unchanged.

Root integrity verification now validates the complete filename allowlist before reading any configuration. Disposable-directory probes cover valid manifests, missing entries, non-object input, unexpected paths and incorrect checksums. A local ESLint rule enforces blank lines between adjacent shorthand object methods across source, fixtures and tooling. Deliberately invalid snippets in all four workspaces and scripts were rejected; autofix and leading-comment preservation were verified. This syntax check does not prove semantic ownership or handle every possible function-valued property form.

## Verification evidence

After backend iterations 4 and 5, the full Node.js 24.16.0 check passed `npm run verify`: 404 tests (251 backend, 12 frontend, 65 contracts, 76 runtime), strict types, lint, formatting, clean builds, configuration checksums, test layout and Prisma validation. This section owns verification updates; benchmark assertions are separate from test counts.

A subsequent isolated `npm run benchmark:runtime` run completed all 79 scenarios with correctness assertions and source/build identity checks. Its [raw report](benchmarks/2026-10-06T19-43-53.019Z-5f307b82-ef08-42de-a7eb-88403317d91a.json) and CSV tables are retained; one run does not establish a performance improvement. An initial concurrent attempt overlapped clean builds and failed before saving a report; the successful rerun started after verification finished.

The last documented remote workflow [failed at startup](https://github.com/mikalaiulasevich/kelpie/actions/runs/37486945771) before jobs were created. A current remote CI result, Bun compatibility, public deployment and current browser acceptance are not established by these local results.
