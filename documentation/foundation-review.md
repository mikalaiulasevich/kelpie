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

| Boundary                    | Evidence or limitation                                                                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input handling              | Depth/node/size limits, reserved-key rejection, own-property references, body limits; unsupported compression returns 415                            |
| Diagnostics                 | Server-owned request identifiers, redacted public errors, bounded hashed stack locations, allowlisted codes/messages; multiline/accessor regressions |
| Startup failure             | Subprocess tests cover invalid environment and occupied ports; Nest `abortOnError` is disabled so controlled failure handling runs                   |
| Shutdown                    | Real partial-body/SIGTERM regression covers the ten-second HTTP drain deadline and database disposal afterward                                       |
| Log backpressure            | Bounded drop accounting; a failed destination disables writes. Deployment must supervise collection and retention                                    |
| Development process cleanup | POSIX process-group cleanup was exercised, including descendants ignoring SIGTERM; Windows behavior is unverified                                    |
| SQLite contention           | The synchronous five-second busy wait may block the event loop; the HTTP drain timer cannot cancel synchronous database work                         |

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

## Verification evidence

After documentation consolidation, route-type cleanup and removal of unused test tooling, the full Node.js 24.16.0 check passed `npm run verify`: 231 tests (80 backend, 12 frontend, 65 contracts, 74 runtime), strict types, lint, formatting, clean builds, configuration checksums, test layout and Prisma validation. This section owns verification updates; benchmark assertions are separate from test counts.

The last documented remote workflow [failed at startup](https://github.com/mikalaiulasevich/kelpie/actions/runs/37486945771) before jobs were created. A current remote CI result, Bun compatibility, public deployment and current browser acceptance are not established by these local results.
