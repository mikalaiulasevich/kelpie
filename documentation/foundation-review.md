# Foundation engineering review

## Scope

Review covers the application scaffold, configuration contracts/runtime, initial database schema, health endpoints, development startup, and dependency selection. Complete funnel behavior and public production deployment are outside this foundation milestone.

## Runtime simplification follow-up, October 6

Added `FunnelRuntime.Evaluation.evaluate(configuration, variant, answers)` to return route and result from one evaluation. Route traversal now records result eligibility while accepting answers, eliminating the second validation pass. Existing route/result entry points and the `AvailableRoute` shape remain compatible. Missing or rejected optional answers remain inactive and do not block a result; they do not advance question progress. Required unanswered questions still block the result, including when excluded from progress accounting.

A per-call `AnswerIssueCollection` supplies chainable `addWhen` operations to numeric and multiple-selection validators. It centralizes issue construction while preserving diagnostic order, own-property custom messages, empty custom messages, bounded selection checks and call isolation. Numeric fallback messages are formatted eagerly; this is bounded work and is included in the benchmark below.

The proposed single step-override merge was rejected after typechecking: spreading the union loses the relationship between the step discriminant and required content. `Object.assign` compiles through an intersection but weakens that check. Exhaustive branches remain with an explanatory comment; no unchecked assertion or new dependency was introduced.

Independent review found no blocking regression. Full Node.js 24.16.0 `npm run verify` passed 209 tests (79 backend, 8 frontend, 63 contracts, 59 runtime), lint, formatting, types, builds, checksums, test layout and Prisma validation. Eight added runtime cases cover completion/progress distinctions, one validation per active answer, message ordering and isolation.

The existing 12-scenario pure-runtime benchmark on Apple M4 / Node.js 24.16.0 used seven samples after warmup. Median sample durations before → after: configuration validation (1,000 operations) 193.344 → 186.518 ms; route resolution (10,000) 99.524 → 88.232 ms; result resolution (10,000) 214.812 → 138.040 ms. These sequential local samples show no observed regression, not a controlled speedup or application-throughput guarantee. No browser, deployment, session persistence or analytics verification is implied.

## Complete authored-file review, October 6

Reconciled the original inventory of 212 authored files with four additions: all 216 have individual decisions and content hashes in [the audit manifest](file-audit.json). This pass changed 55 files and retained 161 after review. The supplied configurations and generated dependency lock have separate integrity entries. Generated output, dependencies, local secrets/data and the evidence manifest itself are excluded from authored-source coverage.

Corrections include domain ownership of compiler and launch settings, static path naming, dedicated button styles/types, test fixture resource ownership, catalogued fixture diagnostics and consistent script import order. Small private types and tool-required field names retain their documented cohesion and interoperability exceptions.

Behavior checks cover an already-aborted frontend request creating neither a fetch nor timer, transport/JSON failures disposing timers, repeated shutdown retaining the original deadline, and simultaneous fixture close/removal failures preserving both errors. Cleanup is attempted; arbitrary resource failure is not a guarantee of successful release.

Integrated Node.js 24.16.0 `npm run verify` passed: 201 cases (79 backend, 8 frontend, 63 contracts, 51 runtime), lint, formatting, strict types, clean builds, original configuration checksums, test layout and Prisma validation. Four of the additional reported contracts cases split existing assertions into case-table entries rather than add coverage. Installed and lock-only dependency trees passed `npm ls`. No new remote CI, browser acceptance, production deployment or penetration-test result is claimed. Earlier sections below are historical milestones.

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

## Operation complexity and benchmark interpretation, October 6

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

Full configuration validation is **not claimed to be linear in bytes**. After document inspection it runs the once-compiled Ajv validator and semantic checks. Ajv cost depends on schema alternatives, string validation and uniqueness checks; measure that complete boundary independently. For semantic validation, include steps/options, both variant sequences and override dictionaries, result rules, event properties and every condition occurrence. Selection option sets are now indexed lazily within one validation context. Across predicate visits, the option-index work is `O(sum(options of distinct referenced selection steps) + total operand visits)` with additional retained memory proportional to those indexed options for that call. Previously, rebuilding for every predicate contributed `sum(O_referenced + operandCount)`. The same visibility condition can be visited in both variants. The 30-issue cap bounds retained diagnostics, not semantic traversal time.

Current policy limits are 262,144 conservatively estimated document bytes, 20,000 visited nodes, document depth 24, 100 steps per variant, 100 options per selection and 100 result rules. Limits bound accepted workloads; they do not justify calling every operation constant-time. In particular, the bounds walker obtains `Object.keys` before checking container width, and obtains all entries before processing them. An already allocated oversized JavaScript object still incurs enumeration work proportional to its width. Parsed HTTP input additionally needs the transport body limit. Getters and proxies are outside the plain parsed-JSON assumption.

Benchmark fixtures should vary sequence length, option count, selected-answer count, condition depth/breadth, membership-list length, rule match position and configuration bytes independently where schema limits permit. Include missing/invalid answers, hidden branches, first/last/no rule match and bounded rejections. A single small supplied configuration cannot characterize these dimensions. Doubling-size ratios are observations over those particular samples, not proofs of asymptotic complexity; warmup, allocation, garbage collection and timer overhead can change them.

Potential optimizations require a recorded baseline and repeated comparable runs before adoption. Reusing option membership indexes within one configuration-validation context can avoid rebuilding the same set for every predicate without introducing a cross-call stale cache. Lazy fallback-message construction could reduce valid-answer allocations, but should be retained only if its measured benefit justifies the extra API. A route-position index is worthwhile only for repeated navigation over one resolved route; constructing it for a single lookup still costs `O(V)`. Preserve ordering, short-circuit behavior, bounded inputs, caller isolation and type narrowing in each experiment. No optimization or memory reduction is established by this static table alone.

## Recorded benchmark suite and measured option index, October 6

`npm run benchmark:runtime` now builds and measures the production package exports through 76 independent cases under `packages/funnel-runtime/tests/`. It replaces the old three-operation script. Fixture setup and correctness checks run outside timed batches; every case is checked before warmup and after measurement. Nine batches are recorded per case after 200 warmup calls, with rotating case order. The output retains every sample, per-case iteration count, median/minimum/maximum batch-average nanoseconds per operation, runtime/hardware details and source identity. Source and compiled artifact hashes are checked again before writing results. Benchmark cases remain separate from Vitest correctness suites and do not create flaky CI timing gates.

The [latest CSV](benchmarks/latest.csv) and [history CSV](benchmarks/history.csv) are generated by every successful run; individual timestamped JSON files are the primary records. Run one benchmark process at a time. Histories are appended, not rewritten; a partial report-write failure can leave a JSON record without its derived CSV row. A direct invocation of the TypeScript runner bypasses package rebuilding; use the npm command. Compiled hashes identify the code actually loaded. Source hashes include harness and fixture code, so harness changes also change identity.

A measured optimization now reuses each selection step's option Set within one configuration-validation context. No global cache or cross-call lifetime was introduced. A regression changes the same option array between public validations and confirms rejection → acceptance → rejection with both ordered predicate diagnostics preserved.

| Case                          |                  Size | Before, median µs/op | After, median µs/op |
| ----------------------------- | --------------------: | -------------------: | ------------------: |
| Valid configuration           |               8 steps |              102.254 |              99.747 |
| Valid configuration           |              32 steps |              256.300 |             251.923 |
| Valid configuration           |              96 steps |              667.651 |             651.640 |
| Repeated selection references | 96 options / 96 rules |              617.227 |             451.469 |

The 76-case baseline is `2026-10-06T18-06-29.107Z-0f11f3b4-af53-4d1e-83c3-716514f86187`; the final candidate is `2026-10-06T18-07-05.127Z-fd782eff-be73-4e71-96a8-33b99ce03a38`. The old two-method implementation was temporarily restored for the baseline and the indexed implementation restored afterwards. The same measured cases/iteration counts were used; final harness changes only moved descriptive metadata to its message owner. An earlier indexed run measured 461.157 µs/op on the repeated-reference case; an exploratory 53-case baseline measured 612.764 µs/op. All runs remain in history, including that explicitly smaller exploratory catalog.

The targeted case improved by about 27% in these local measurements. The smaller changes on other configurations are within plausible run-to-run variation and are not claimed as speedups. Timings do not prove complexity, universal speedups, latency percentiles or production capacity. Memory costs here are static auxiliary-space estimates, not heap/peak-memory measurements.

Final integrated verification passed `npm run verify`: 210 tests (79 backend, 8 frontend, 64 contracts, 59 runtime), strict types, lint, formatting, builds, original configuration checksums, test placement and Prisma validation. All 76 benchmark cases independently checked their expected results before and after timing; these benchmark checks are not included in the 210 unit/integration case count. Raw generated benchmark JSON is excluded from formatting to preserve evidence bytes; authored benchmark code remains formatted, linted and typechecked.

## Mnemonist comparison and adoption decision, October 6

Evaluated pinned Mnemonist 0.40.5 through 34 paired cases: native membership versus `set.isSubset` (valid, duplicate and unavailable choices at 8/32/96 options), manual lazy Map versus DefaultMap (cold and 96-reference workloads), and Array versus Stack (256/2048 object payloads with an order-sensitive checksum). All collection construction is inside timed calls; input construction and expected-result checks are outside. Each workload uses the same values and iteration counts on both sides. The target option string is constructed once per reference workload, as real predicates already contain it. Nine sample batches follow warmup; two complete comparison runs were recorded.

The [comparison table](benchmarks/mnemonist-comparison.csv) is an archived snapshot. The dedicated experiment runner and dependency were removed after the adoption decision; the runtime latest table remains active. The shared history retains all runs; JSON records now identify the suite. The comparison helpers execute via tsx and invoke the installed library; they are not described as production package benchmarks.

| Structure workload             |          Size | Native run 1 / run 2, µs/op | Mnemonist run 1 / run 2, µs/op |
| ------------------------------ | ------------: | --------------------------: | -----------------------------: |
| Valid selection membership     |    96 options |               3.634 / 3.439 |                  3.750 / 3.581 |
| Duplicate selection membership |    96 answers |               2.676 / 2.498 |                  2.176 / 2.050 |
| Lazy index, 96 references      |    96 options |               2.722 / 2.344 |                  2.535 / 2.332 |
| Object stack push/pop          | 2,048 entries |               8.562 / 8.122 |                17.909 / 17.650 |

The structure runs are `2026-10-06T18-15-27.289Z-c178fa24-6b7f-4864-98d0-30f4d34c7976` and `2026-10-06T18-16-33.780Z-02bcd34b-8b74-4ebd-b549-f809780fcbd7`. The DefaultMap difference is not a stable gain. Stack was consistently slower. Subset testing benefits duplicate-heavy inputs because it iterates the distinct selected values, but did not improve ordinary valid membership.

To check the full operation, temporarily replaced only the multiple-selection membership predicate with `set.isSubset(selectedValues, optionValues)` and ran the public compiled runtime benchmark plus its 59 correctness tests. Added three duplicate-answer cases to the main catalog (79 total). The candidate preserved behavior but did not establish a useful general improvement:

| Full answer validation     | Native before, µs/op | Mnemonist candidate, µs/op | Native restored, µs/op |
| -------------------------- | -------------------: | -------------------------: | ---------------------: |
| Valid 96-option answer     |                4.144 |                      4.352 |                  4.318 |
| Duplicate 96-choice answer |                3.582 |                      2.960 |                  3.557 |
| Unavailable choice at tail |                4.285 |                      4.471 |                  4.456 |

These three runtime runs are `2026-10-06T18-17-08.850Z-8994d5df-2b23-40a7-957d-84237b5f9120`, `2026-10-06T18-17-38.141Z-f5bfa1c1-36c8-4e1c-a864-8b635bc06f75`, and `2026-10-06T18-18-17.467Z-6cc49628-35bf-421b-a87f-973456147c5a`. Small normal-path differences overlap run-to-run variation; do not treat the first comparison's roughly 5% difference as a universal slowdown. Duplicate rejection improved around 17%, but that narrow benefit does not justify introducing a production dependency here. The original implementation was restored and rebuilt. Mnemonist was retained initially as a pinned devDependency; the completed experiment harness and dependency have now been removed. Git revision `3387d9520f4321d562bb5c1d019e294ae96990a2` preserves the harness and lockfile for historical reproduction.

The [official DefaultMap documentation](https://yomguithereal.github.io/mnemonist/default-map) describes lazy value construction; its installed implementation wraps a native Map, so it does not change asymptotic complexity. Its factory must return a Set here, never undefined. The [SparseSet documentation](https://yomguithereal.github.io/mnemonist/sparse-set) targets bounded integer keys; our string identifiers would require mapping, which was not hidden or excluded from a favorable comparison. SparseSet was therefore not selected for this experiment.

Native Node.js ESM rejected Mnemonist 0.40.5 individual-module imports because its package exports expose those paths only for require/types. Benchmarks use the supported root named imports. No CJS bridge, TypeScript target widening, production cache or browser bundle change was introduced. `npm install` reported zero dependency advisories at installation; this is a local snapshot, not a permanent security guarantee.

A third 34-case comparison after the case-table ownership correction is recorded as `2026-10-06T18-21-11.022Z-3bb7d82e-802f-4662-84cf-227128c82a11`: valid membership at 96 options was 3.207/3.284 µs (native/Mnemonist), duplicate membership 2.588/1.922 µs, repeated index lookup 2.270/2.241 µs, and the 2,048-entry stack 7.401/16.947 µs. The adoption decision is unchanged. Named scenario tables now live in tests/cases; fixtures own data construction and candidate operations.

## Es-toolkit adoption, October 6

Adopted pinned es-toolkit 1.52.0 in the runtime package. `ExperimentResolution` now expresses dictionary transformations with `mapValues` instead of two mutable accumulators and entry loops. `AnswerValues.isMissing` uses `isNil` and the explicit empty-string rule instead of a pattern matcher for a simple guard. Domain owners, exhaustive step dispatch and public contracts remain intact. Category imports keep dependency ownership explicit.

Reviewed analogous candidates across source, fixtures and tooling. Retained own-property access, bounded sparse-array inspection, native membership Sets and the per-validation option cache. Toolkit `isPlainObject` accepts additional object forms (including cross-realm objects), so it would widen the configuration boundary. `uniqBy` would allocate a result array solely to count distinct options. Neither replacement improves this implementation enough to justify altered semantics or additional allocation. No global memoization or chain wrapper was introduced.

Three sequential compiled-runtime runs exercised all 79 scenarios, each with correctness checks before and after timing. Values below are medians of nine batch averages on local Node 24.16.0 / Apple M4; they are not request latency or capacity measurements.

| Operation              |     Size | Before, µs/op | After 1, µs/op | After 2, µs/op |
| ---------------------- | -------: | ------------: | -------------: | -------------: |
| Experiment resolution  |  8 steps |         0.305 |          0.312 |          0.308 |
| Experiment resolution  | 32 steps |         3.056 |          1.045 |          1.087 |
| Experiment resolution  | 96 steps |         9.436 |          3.657 |          3.592 |
| Valid numeric answer   | 1 answer |         0.555 |          0.476 |          0.471 |
| Invalid numeric answer | 1 answer |         0.582 |          0.508 |          0.481 |

Raw reports: baseline `2026-10-06T18-35-35.170Z-b942ae99-bbae-4208-8ed9-93e136963591`, candidate `2026-10-06T18-36-01.875Z-6c8ee471-18d9-4e1a-ab93-a85f7d9a536a`, repeat `2026-10-06T18-36-35.154Z-f9e8911e-61c0-46dc-89fa-9617a6fd201b`. Baseline already included the installed dependency but did not import it. The repeat includes added regression tests; production source is identical to the first candidate. Mapping remains O(steps + results) time and output space. The local 96-step operation took roughly 61–62% less time; the smallest dictionary shows no material gain. This single baseline and two candidate runs do not establish a universal speedup.

Added six public-behavior regressions: own dictionary keys/order and fresh outputs; zero remains a present answer; false, NaN, empty arrays and whitespace do not bypass optional numeric validation. Existing tests cover null/undefined/empty strings, inherited overrides, input immutability and sparse selections. Independent read-only review found no blocking issue.

## Runtime allocation and traversal polish, October 6

Retained three measured simplifications: semantic step validation reuses its context-owned selection index; the numeric guard delegates to noncoercing Number.isFinite; progress checks use the schema-bounded list directly instead of constructing a Set per route. The missing-answer predicate also reuses Nullable. Domain objects, exhaustive dispatch, diagnostics order, own-property access and sparse-array validation remain intact.

| Operation                     |     Size | Baseline, µs/op | Candidate, µs/op | Repeat, µs/op |
| ----------------------------- | -------: | --------------: | ---------------: | ------------: |
| Route resolution              | 96 steps |          72.023 |           63.150 |        62.876 |
| Complete funnel evaluation    | 96 steps |          72.755 |           63.664 |        63.310 |
| Valid numeric answer          |        1 |           0.473 |            0.375 |         0.383 |
| Invalid numeric answer        |        1 |           0.496 |            0.406 |         0.408 |
| Configuration validation      | 96 steps |         672.796 |          667.593 |       665.491 |
| Repeated selection references |       96 |         469.656 |          461.473 |       457.976 |

All runs use the same 79 compiled-runtime scenarios and verify expected outputs before and after timing. Baseline: `2026-10-06T18-43-35.410Z-74d581b4-11ac-495b-8ea3-bf2b78f9b775`; candidate: `2026-10-06T18-44-51.732Z-0ec9b8ce-74e1-4a24-aead-6f25c1aeaf26`; repeat: `2026-10-06T18-46-18.838Z-0a96af05-bf95-40fa-a01f-83a7b7f2134d`. Local medians of nine batch averages on Node 24.16.0 / Apple M4 are microbenchmark evidence, not service latency or capacity. The approximately 12–13% route/evaluation and 18–21% numeric-validation gains appeared in both candidate runs. Configuration differences are too small to claim a reliable speedup.

Complexity remains explicit: routing is O(S × E + answer/condition work), where validated E is at most five excluded types, hence linear in S for the progress contribution. Numeric checking remains O(1). Reusing the option index removes a second O(O) construction for referenced selection steps; validation was already linear in total options and operands. All selection indexes now survive until that validation call ends, including unreferenced steps, trading bounded per-call memory retention for reuse and a single implementation. No cross-call cache or invalidation mechanism was added.

Rejected a lazy-message-formatting experiment: valid numeric validation changed from 0.375 to 0.368 µs, invalid from 0.406 to 0.408, and route resolution from 63.150 to 63.836. This does not justify a new generic method and longer call sites. Raw trial: `2026-10-06T18-45-29.261Z-a2ac2134-f46a-4743-aada-fd01ed1c89f8`; all three formatter files were restored. Deferred collapsing Object.keys/Object.entries in document bounds because it changes getter-read timing and diagnostic precedence for non-JSON objects at the unknown-input boundary. Retained ordered result-rule traversal and navigation scans: no stable reusable route index is needed by current callers.

Independent review checked all retained source changes. Added regression cases for bigint/Symbol numeric rejection and progress excluding none/all five types; the existing mutation-between-validations regression covers index freshness. No source algorithm was replaced solely to shorten syntax.
