# Development timeline

The assignment's 48-hour start has not been agreed or recorded. The milestones below occurred on October 6, 2026; they are not an elapsed-time claim.

| Milestone                      | Outcome                                                                                                                                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope and foundation           | Agreed NestJS, React/Vite, Prisma/SQLite and Tailwind/shadcn. Created the repository and implementation plan. Copied all three supplied configurations with SHA-256 checksums.                                                                  |
| Contracts and runtime          | Implemented bounded configuration validation, A/B overrides, answer validation, conditional routes, progress and results. Added historical-configuration and adversarial-input coverage.                                                        |
| Application infrastructure     | Added database migrations/readiness, validated environment settings, health endpoints, structured redacted diagnostics and bounded shutdown. The frontend checks actual backend readiness.                                                      |
| Code conventions               | Adopted domain-owned operations/types/policies/messages, kebab-case filenames, strict workspace TS/JS configurations and tests-only test directories. The current rules are in [AGENTS.md](../AGENTS.md).                                       |
| Measurement and simplification | Added the 79-scenario runtime benchmark and result tables. Shared route/result evaluation and per-validation indexes; adopted toolkit operations where semantics and measurements supported them. Rejected the production Mnemonist experiment. |
| Pre-feature cleanup            | Consolidated repeated review reports into current documentation and a single file inventory. Removed unused test tooling and merged the internal route-direction vocabulary into its domain types.                                              |

The HTTP foundation now uses NestJS with Fastify, native request hooks and `@fastify/helmet`. Express-specific dependencies and response handling were removed; Node.js remains the verified backend runtime.

## Backend iteration 1 — configuration drafts (October 7, 2026)

Added immutable configuration imports through a trusted local command. The configuration domain owns validation, canonical content identity and transactionally stored drafts. Import does not publish or change existing sessions. Administrator-protected HTTP management and activation followed in iterations 2 and 3; user-session ownership and commands followed in iterations 4 and 5.

Pino now owns backend diagnostic output, with validated LOG_LEVEL, a Nest LoggerService bridge, request correlation and bounded stream handling. CLI results remain machine-readable stdout; diagnostic records go to stderr.

## Backend iterations 2 and 3 — administration and activation (October 7, 2026)

Iteration 2 adds secret-based administrator provisioning, password sign-in, revocable and expiring cookie sessions, Origin/header CSRF checks and bounded sign-in work. Iteration 3 adds protected immutable imports, active-version lookup, transactional publication and history-based rollback, revision conflicts and replay of previously committed commands. An additive transactional migration preserves existing activation history and session/analytics records.

Real SQLite and HTTP tests cover authorization before replay, simultaneous command retries, conflicting revisions, activation rollback after write failure and preservation of pinned session references. The local provisioning command was additionally exercised as a separate process. This is backend API delivery; the administration UI and browser/public acceptance remain pending.

A follow-up ownership pass consolidated shared management contracts and CLI lifecycle, grouped publication schemas, simplified password decoding and replaced import error branches with exhaustive maps. Review caught and corrected a credential snapshot regression; dedicated mutation and lifecycle tests now guard those boundaries. No additional product iteration is claimed for this refactor.

The repository-wide follow-up grouped shared schema owners without changing the serialized schema, contained throwing error-code accessors, reused database error classification and aligned health types. It also corrected stale frontend status text, simplified state rendering, hardened configuration-manifest validation and made root administrator provisioning prepare generated dependencies. Formatting checks now cover all workspace source modules. Runtime algorithms and raw benchmark evidence were retained.

## Backend iterations 4 and 5 — session ownership and commands (October 7, 2026)

Iteration 4 adds signed anonymous bootstrap cookies without analytical session creation, a persisted signing key, authenticated current-state reads and idempotent session creation. Creation pins the active version and weighted/forced variant, captures bounded acquisition parameters and commits the initial snapshot, operation receipt and `session_started` together. Expiration replaces ownership through a new handshake. Cookie renewal preserves the original credential and the server expiry.

Iteration 5 adds explicit answer submission, information Continue and Back with optimistic session revisions. Commands atomically persist answers, confirmation changes, navigation transitions, authoritative events and immutable replay responses. Hidden answers retain their values while losing confirmation; only confirmed active values affect branching and results. Public identifiers alone cannot recover answers. Raw answer storage is separate from analytical event properties.

Scoped real SQLite/HTTP tests cover creation retries, sticky versions/variants through publication and rollback, CSRF/ownership, delayed bootstrap expiry, retained branches and command concurrency/failure paths. A second Nest application against the same SQLite database checks persisted signing-key continuity; this is application-instance evidence, not a deployed restart or backup/restore drill. The final Node.js 24.16.0 `npm run verify` passed 404 tests, types, lint, formatting, builds, configuration checksums and Prisma validation. At that milestone, browser draft persistence, first-open coordination, client observations/CTA ingestion, analytics and UI were still pending.

A subsequent cross-module maintenance pass grouped session/contract schemas and validators, reused validated configuration within each command, tightened credential validation and made diagnostics read metadata once. Tooling now enforces spacing between adjacent object methods and validates complete integrity manifests before file reads. This adds no product iteration. Final `npm run verify` passed 412 tests; npm audit reported zero known vulnerabilities. Public API schemas and supplied configuration bytes were preserved.

## Backend iterations 6 and 7 — event ingestion and analytics (October 7, 2026)

Iteration 6 adds authenticated bounded event batches, historical revision eligibility, declaration/property checks and independent durable receipts. Real HTTP/SQLite tests cover malformed siblings, concurrent retries, delayed branch events, v3 actions after rollback and partial batch failure. An additive migration preserves existing facts. A separate-process writer lock verified retryable 503 behavior and unchanged-intent recovery.

Iteration 7 adds administrator SQL analytics with consistent cohort filters, version/A/B groups, distinct session sets, historical edges and explicit ratio operands. Review corrected DateTime comparison for SQLite ISO storage; tests also preserve numeric legacy support. Exact aggregate fixtures and query-plan inspection cover the main definitions. These are backend APIs; the dashboard, browser event queue and synthetic generator are not yet implemented. The final Node.js 24.16.0 `npm run verify` passed 458 tests, types, lint, formatting, builds and Prisma validation. An additional real API-to-analytics flow verifies unique counts after shuffled observations, duplicate identifiers and whole-batch replay. Verification limits are maintained in the engineering review.

A subsequent maintenance pass simplified analytics orchestration, typed event dispatch and session result/replay reuse, reorganized analytic scenarios and removed a duplicate event fixture. Three review passes and the full Node.js verification retained all 458 passing tests. This was maintenance, not a new product iteration.

Backend composition was subsequently split into feature Nest modules with explicit provider ownership and imports/exports. Environment configuration is registered once per application; database and feature services retain singleton ownership. Two integration regressions cover module resolution, database disposal and isolation of simultaneous applications. This changes composition, not the delivery scope of the backend APIs.

## Bun backend and application split

Bun 1.3.14 now executes the backend with the official local-file libSQL adapter; Node.js 24.16.0 retains better-sqlite3. Both use the same Prisma schema/migrations and ISO timestamp storage. Node/npm remain build/migration tools. The combined verification passed 465 workspace tests on Node and the same 312 backend tests on Bun. Clean frozen Bun installation retained the native Node fallback; compiled import/replay and cookie-owned HTTP session state survived Node → Bun → Node on one disposable SQLite database. A Bun CI job is configured but has not been verified remotely.

The public quiz is planned as a separate Next.js application at applications/quiz. Existing applications/frontend is the React/Vite administration target, including dashboard. Neither product interface was scaffolded during the runtime migration. IMPLEMENTATION_PLAN owns the updated remaining sequence.

## Administration UI iteration 1 — authorization (October 7, 2026)

Connected the React/Vite administration interface to the existing username/password, current-session and sign-out endpoints. The official shadcn/ui login-02 block supplies the two-column composition; fields, password visibility and error states are adapted to the backend contract. Credentials are not persisted by the client. Password reset remains unsupported because no server endpoint exists.

Browser checks against an isolated real NestJS/SQLite backend verified rejection of an incorrect password, successful sign-in, reload restoration, server-side sign-out and sign-out after expiry. Independent review caught the expired-session sign-out case; client regression coverage now distinguishes authoritative 401 from network/origin/server failures. Full Node.js 24.16.0 verification passed 487 workspace tests plus types, lint, formatting, builds and Prisma validation. Configuration management, dashboard and public deployment remain pending.

## Administration UI iteration 2 — management and analytics (October 7, 2026)

Adapted the official shadcn/ui sidebar-07 block and dashboard components into the authenticated workspace. Added configuration imports with backend validation, immutable version metadata, revision-checked publication, activation history and rollback. Analytics reads the existing API with version/campaign/origin/forced-assignment filters and displays A/B ratios, steps and observed paths, including zero-denominator and empty states.

Publication intent is stored before sending; uncertain outcomes survive reload and retry with the same operation identifier. Independent review corrected navigation initialization and bounded pagination. Browser checks against a separate real NestJS/SQLite instance exercised invalid and duplicate imports, publication, rollback and timeout/reload/retry without duplicate publication, plus responsive layouts. All fixture observations were marked synthetic; production showed empty cohorts. Node.js 24.16.0 full verification passed 531 tests, types, lint, formatting, builds and Prisma validation. Public quiz, traffic generation and deployment remain open.

## Administration theme refinement (October 7, 2026)

Applied the dark neutral shadcn theme with one blue accent through shared semantic tokens. Authentication artwork, sidebar, charts and overlays use the same palette; native controls follow the dark color scheme. Frontend build and formatting checks passed. Browser inspection used the isolated backend for the workspace and the normal development server for sign-in.

## Administration UI iteration 3 — version inspection (October 7, 2026)

Replaced metadata-only Details with a deep-linked read-only configuration inspector. It shows each variant’s ordered steps and resolved text, explicit conditions, results and CTA actions, experiment declarations, events/privacy, session/progress settings and original JSON. The protected document endpoint validates stored content and checksum/identity; viewing does not change activation or pinned sessions.

Real HTTP tests exercise v1–v3, authorization/revocation, malformed/missing identifiers and corrupted records. Frontend regressions cover document semantics and identity, request cancellation, routing, override merging and escaped rendering. Browser checks against an isolated real backend passed variant selection, step inspection, conditional/numeric details, results/CTA, events, original JSON, reload deep links, absent/wrong-funnel failures and mobile overflow checks. Node.js 24.16.0 full verification passed 565 tests, types, lint, formatting, builds and Prisma validation. The local development backend was restarted with the new protected route; anonymous access returned 401. Public deployment remains unverified.

## Administration UI refactoring (October 7, 2026)

Separated workspace routing, funnel selection and analytics filter editing from page orchestration. Consolidated read cancellation/error/401 handling and deferred workspace, page, dialog and chart modules. Initial production JavaScript including static dependencies decreased from 608,278 to 477,310 bytes; consistent per-file gzip measurement decreased from 184,529 to 147,367 bytes (20.1%). This is a transfer-size comparison, not a measured interaction or network latency result.

Fixed storage cleanup failures after publication and cancellation rejection from errored HTTP streams. Independent review prompted local lazy-module error boundaries. Browser checks with an isolated real backend verified sign-in, filters applying only on Apply, publication, navigation, revoked-session 401, forced chart download failure and reload recovery. Full Node.js 24.16.0 verification passed 588 tests plus types, lint, formatting, builds and Prisma validation. Storage failure coverage uses mocked browser storage/HTTP; deployment remains unverified.

## Administration visual refinement (October 7, 2026)

Studied public Intent UI patterns, minimalist dashboard, app-shell and details examples alongside the official shadcn documentation. Retained the existing libraries and dark neutral palette with one blue accent. Replaced decorative sign-in artwork and marketing headings with a centered form, compact page headers, property lists and full-width version/history tables. Analytics keeps explicit ratio operands and the synthetic-traffic caveat; longer metric definitions move into a disclosure. The read-only inspector uses line tabs and a step/detail layout, with identifiers and advanced validation disclosed on demand.

Full Node.js 24.16.0 verification passed all 588 workspace tests, types, lint, formatting, builds and Prisma validation. Browser checks used an isolated real NestJS/SQLite backend for analytics filters, metric disclosure, mobile navigation, import dialog, A/B step inspection, publication, rollback, activation history and sign-out. Effective CSS widths of 390, 768 and 1600 pixels were inspected; a cramped mobile description/variant row was corrected and rechecked. The final presentation fixes also passed scoped types, lint, formatting and frontend build. No dependencies or backend contracts changed. Public deployment remains unverified.

## Administration table interactions (October 7, 2026)

Composed existing shadcn DropdownMenu primitives into per-version actions and column visibility controls. Version links open the read-only inspector directly; publication remains revision-checked and requires the existing confirmation. Schema and checksum columns can be toggled without changing the data query or pagination. Checksum starts hidden to reduce table density. No packages or backend contracts changed.

Review and browser checks caught lost keyboard focus after closing programmatically opened dialogs. Publication menus now pass their trigger as an explicit return target; import and publication dialogs restore the caller, or the workspace content when that caller has been replaced by refreshed data. Tested keyboard menu entry, live-version publication disabled state, column toggles, Details navigation, Cancel/import focus return and real publication on an isolated NestJS/SQLite backend. The default table fits a 390-pixel CSS viewport. All 125 frontend tests, frontend build/typecheck, scoped lint, formatting and diff checks passed; full backend verification was not rerun for this frontend-only change.

## Verification history

The initial foundation was installed and checked locally on Node.js 24 and 26. A frontend readiness check was inspected in desktop/mobile layouts at that milestone. Subsequent refactors were checked on Node.js 24.16.0; they do not constitute new browser or Node.js 26 verification.

The subsequent plan-conformance pass corrected optional-answer progress, scoped operation identifiers to their session, isolated diagnostics from supplied error stacks and aligned development shutdown budgets. That pass was followed by the Fastify migration; the recorded verification after backend iterations 2 and 3 covered 380 tests and the full verification command. That historical run predates session iterations 4 and 5. The previous toolkit review’s three 79-case benchmark runs and the current verification summary are recorded in [the engineering review](foundation-review.md). Raw reports and CSV history remain in [benchmarks](benchmarks/).

A historical GitHub Actions attempt failed before jobs started; this cleanup does not establish current remote CI status. No public deployment has been verified.

## 2026-10-07 — Reference-based administration composition

Adapted the supplied shadcnexamples references using the existing shadcn components: split authentication with a generated blue glass cover, larger cards and table spacing, four desktop A/B metrics, horizontal conversion comparison, collapsible filters and grouped configuration/import surfaces. Backend contracts, library dependencies and authentication behavior remain unchanged. Local browser checks covered the isolated API fixture, real upload validation, mobile layouts and collapsed navigation. Frontend verification passed 125 tests and production compilation; design-qa.md records visual comparisons and limitations. No deployment or remote CI result is implied.

## 2026-10-07 — Populated administration workspace

Expanded the configuration library with version highlights, scoped search/status filtering/numeric sorting and activation context. Analytics now combines variant summaries, chart/context and an immediately available journey table; controlled version selection survives refresh and compatible filter changes. Added semantic statuses and reduced-motion-aware interaction feedback. Browser QA covered desktop plus 390/768 CSS-pixel layouts, search reset, sorting, row actions, filters, variant/path tables and the import dialog. All 128 frontend tests, production compilation, lint and formatting passed.

At the user's request, seeded the local database with six derived demo configurations and 192 synthetic sessions through existing application boundaries. A backup preceded mutation, administrator credentials stayed unchanged, and a rerun added zero records. This local visual seed is not the planned production-facing traffic generator or deployment acceptance.

## 2026-10-07 — Palette and analytics controls

Refined the existing dark administration theme with amber actions, semantic green/coral metrics, stronger card typography and an amber glass authentication image. Replaced version tabs with a paginated searchable picker and moved cohort filters into a responsive shadcn Sheet. The real backend and existing synthetic fixture remain authoritative. Browser checks covered selection/search, Refresh/Apply/Cancel and desktop/mobile composition; 130 frontend tests, compilation, lint and formatting passed. Search is scoped to each metadata page; production deployment remains outside this visual pass.

## Remaining delivery milestones

| Iteration            | Status                                                                                                                                                                                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First working funnel | Runtime, administration, session, event ingestion and analytics APIs available. Administrator authorization, configuration management, activation history and analytics UI available; separate Next.js quiz and browser event queue now implemented locally; public acceptance remains. |
| Second iteration     | Pending the first working funnel. Publish v3, verify both variants and retained older sessions, then roll back to v2 while preserving v3 sessions and analytics.                                                                                                                        |
| Deployment           | Bun backend and Node.js/npm fallback verified locally; hosting with persistent storage and public acceptance remain pending.                                                                                                                                                            |

[IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) owns the detailed acceptance sequence. Update this timeline for completed product milestones; keep command output and repeated polish reports out of it.

## 2026-10-07 — Kelpie dark brand across administration

Applied the supplied landing-page typography and dark reference to authentication, analytics, configuration management, version detail, history and shared dialogs. Added floating responsive navigation, nested warm surfaces, asymmetric analytics composition and reduced-motion-aware entries. Preserved existing API/authentication contracts and configuration data. Removed illustrative fake JSON from version highlights. Frontend checks passed 139 tests, typecheck, build, scoped lint and formatting; browser evidence and remaining boundaries are recorded in the engineering review.

## 2026-10-07 — Workspace interaction details

Added discoverable guarded keyboard shortcuts, light navigation icons, route/tab/disclosure transitions, decorative journey/experiment/version illustrations and the existing amber-glass texture. Sign-in and import forms now expose clearer focus, pending, reading and file-selection feedback. All 154 frontend tests, typecheck, production build, ESLint and formatting passed. Browser validation covered authentication validation and artwork; authenticated interaction limits and the then-deferred import-read race are recorded in the engineering review.

## 2026-10-07 — New workspace sidebar

Replaced floating navigation with a newly composed warm dark sidebar, funnel context, descriptive links, keyboard hints and account footer. Small screens use a left drawer with focus restoration and selection dismissal. An isolated browser fixture verifies navigation and responsive behavior without live data or authentication changes. All 155 frontend tests and TypeScript passed.

## 2026-10-07 — Stable analytics tab scrolling

Fixed document scroll clamping when Steps/Paths or A/B panels become shorter. Tabs retain the minimum necessary height before interaction and release that reservation on resize. A reproducible browser fixture covers a long-to-short panel transition on desktop and mobile; 155 frontend tests and the TypeScript/production build passed.

## 2026-10-07 — Marketing analytics and button shortcuts

Added proportional A/B milestone ribbons, pooled KPIs, observed conversion differences and step-reach graphics using existing authoritative analytics. Added guarded action shortcuts and Kbd hints directly in Filters, Refresh and Import buttons. Synthetic browser fixtures verified desktop/mobile charts, zero-traffic behavior and keyboard actions; numerical and shortcut regressions bring the frontend suite to 174 tests.

## 2026-10-07 — Backend and administration integration acceptance

Verified the real administration against an isolated Bun/SQLite backend, including import validation, pagination recovery after import, publication, rollback and analytical milestones from HTTP-created sessions. Fixed stale file-read loading and import pagination/filter recovery. The complete Node/Bun gate passed; exact counts, browser checks and untested boundaries are maintained in the engineering review.

## 2026-10-07 — Separate Next.js quiz

Implemented applications/quiz using the Kelpie reference cream, rust and warm brown palette, original mark and Instrument Sans. Configuration-driven questions support explicit Continue, local drafts, Back, dynamic branches and backend-authoritative recommendations. Durable observations and pending command identifiers preserve retry intent; public API origins now explicitly include the separate quiz while administrator authorization remains scoped to its origin. Browser verification covered mobile welcome, draft refresh, required validation, conditional steps, Back, final result and CTA; persisted events include step/result views and recommendation expansion. Root types, 669 tests, production builds and Prisma validation passed; 86 focused backend tests also passed on Bun. Full verify stopped at pre-existing scratch-script lint errors under test-results; exhaustive browser accessibility, expiry and deployment acceptance remain open.

## 2026-10-07 — Three-application review preparation

Reviewed backend, administration and quiz together with independent domain review. Fixed publication dialog label scope and bounded browser event delivery: queue saturation recovery, atomic observation pairs and shared in-flight delivery. Regression tests cover offline retry, capacity and overlapping effects. Browser acceptance on an isolated database connected publication/rollback, a pinned v3 quiz session and its dashboard metrics. Reconciled stale implementation-status documentation and aligned disposable browser evidence exclusions with Git. Exact checks and remaining assignment gates are recorded in the engineering review.

## 2026-10-08 — Marketing report and operational workflow

Implemented cohort periods/timezones/windows, prior-period comparisons and daily trends; independent acquisition selectors with counts; result distribution; missing-view intersections and privacy-safe step/session diagnostics. Registered business outcomes and immutable experiment plans add explicit sample, allocation, follow-up and uncertainty evidence without a fabricated winner. Reports support browser-local saves, filter links and aggregate CSV. Version search runs before pagination; provenance, comparison against active and isolated synthetic preview are available. English/Russian controls preserve supplied configuration text.

Real SQLite browser fixtures verified a 24-hour to one-hour window excluding a late recommendation open, independent campaign selection reducing six sessions to one, step missing-view diagnostics, saved-period restoration, aggregate CSV and zero-denominator display. The development database was migrated; browser acceptance used a separate temporary database. The final full Node gate passed 745 tests and production builds; all 356 backend tests passed on Bun. Final UI key/chart fixes were followed by the 209-test frontend suite and frontend production build. The quiz retry tests exposed a Node24 Web Locks synchronous-throw lock leak; async lock callbacks and a native-lock regression now cover recovery. Public hosting and exhaustive device/accessibility/performance acceptance remain separate gates.

### October 8 — Analytics interaction polish

Compacted period controls, exposed active presets and unapplied date/window edits, and disabled sharing/export/saving until those edits are applied. Metric cards now use semantic accents, proportional rate bars, smaller localized percent units and aligned comparison footers. Chart tooltips format cohort dates and rates consistently. Frontend verification: 210 tests, typecheck, production build and scoped ESLint passed; browser checks used the isolated SQLite fixture at 1280 and 927 pixels, including pending filters and the changed conversion window. Main administrator authentication was not bypassed.

### October 8 — Analytics review corrections

Separated conversion-window maturity from navigation expiry, corrected local calendar boundaries and previous-period DST comparison, preserved pending period edits across other filters, and moved analytics version search before server pagination. Daily publication markers now group revisions into a single count with expandable details. Also corrected unrecorded campaign selection to include both SQL NULL and empty strings. Verification: complete `npm run verify:bun` passed (758 Node tests and 362 Bun backend tests); subsequent acquisition and 101-version HTTP regressions passed on Node and Bun (4 targeted tests), with the final backend rebuilt. Browser checks confirmed pending 72-hour edits survive traffic changes and eight revisions render as one marker with complete details. Independent source review found no new blocking defects in the six corrections.

### October 8 — Interface consistency pass

Unified administration inputs, native selects, grouped search fields and default actions around 40-pixel desktop controls with larger touch targets. Standardized remaining disclosure chevrons, diagnostic table spacing, preview alignment and compact mobile navigation. Quiz settings now use consistent language controls, long action labels wrap, disabled choices communicate pending state, and decorative orbits no longer cause horizontal overflow. Browser checks covered the isolated administration at narrow and desktop widths plus quiz settings/error layout; the current main preview session could not be restored, so a fresh end-to-end quiz completion is not claimed by this pass.

Final verification: `npm run verify:bun` passed, including 760 Node tests, 364 Bun backend tests, lint, formatting, typechecking, configuration integrity, production builds and database schema validation. Independent UI diff review caught the grouped-input height mismatch before delivery; the correction was included in the final gate.

### October 8 — Readability and predictable controls

Improved table header legibility, wrapped long configuration/report names and differentiated successful report actions from failures using text, icons and semantic colors. Configuration search now accurately says it covers versions rather than only the current page. Loading keeps search and sort controls mounted without showing stale actionable rows. Browser checks on isolated HTTP fixtures confirmed focus remains in search after Enter and on sorting after refresh. Frontend typecheck, scoped ESLint, 217 tests and production build passed; the loading regression checks rendered controls, while focus continuity was verified separately in the browser.

### October 8 — Technical integration and failure recovery

Completed independent backend, administration and quiz reviews and corrected invalid analytics dates, saved-write versus refresh-failure handling, and expired-preview recovery. The full verify:bun gate passed 776 Node tests and 368 Bun backend tests; dependency audits reported zero known vulnerabilities. A production-build quiz preview completed through a real isolated backend and reconciled with administration at one start/result/recommendation open. Runtime benchmark results were refreshed. Remote CI startup failure and external release gates remain documented in the foundation review.

## Free public deployment — October 8, 2026

Created release and development branches and configured Render Free auto-deploy from release in Frankfurt. Turso in Ireland stores the migrated database, first administrator and three original configuration versions. The public quiz and administration share one HTTPS origin. Fixed an inherited Caddy file capability after reproducing the Render startup rejection under restricted container privileges. Public administrator sign-in, v3 publication, a complete synthetic quiz and matching analytics passed. cron-job.org runs a credential-free readiness request every five minutes; its first scheduled execution returned 200. Runtime secrets remain outside source control. Exact gate evidence and free-hosting/rollback limits are in the engineering review.

### October 8 — 10,000-session profiling and analytics query corrections

Added a reproducible administrator-authorized HTTP workload, independent metric oracle, coverage gate, retained SQLite snapshots and resumable checkpoints. Two full synthetic generations exposed global and filtered SQL plan regressions; corrected repeated cohort/fact scans and result-click grouping without increasing timeouts. The final retained dataset contains 10,000 sessions and 230,030 events; complete and filtered HTTP reports passed independent reconciliation after resuming on a copy. Full-report median is 2.009 seconds locally; generation answer p95 is 77.94 ms. Measurements and failed-attempt evidence are retained in the engineering review and benchmark reports. Large replay-record storage, hosted capacity and backup/restore remain explicit next steps; no public traffic load was performed.

Final integrated `npm run verify:bun` passed: 827 Node tests and 419 Bun backend tests, static checks and production builds.

### October 8 — Replay storage and local recovery

Removed repeated immutable configuration/result data from replay storage while retaining legacy reads and exact historical replies. Fixed preview cookie publication before transaction success. Added opt-in bounded compaction and validated local SQLite backup/restore. The copied 10,000-session dataset shrank from 1.257 GB to 247 MB as a standalone snapshot; all 92,999 historical states and unchanged columns across 14 tables matched the original. Real HTTP recovery preserved cookies, pinned versions, retries, events and analytics. Hosted Turso recovery remains separate acceptance work. GitHub Actions stays disabled by user decision. The final local verify:bun gate passed 847 Node tests and 439 Bun backend tests with static checks and builds. A post-compaction HTTP reprofile passed the independent global/filtered oracle; repeated compaction converted zero records.

### October 8 — Assignment sequence and browser expiry recovery

Added the complete v1/v2/v3/rollback HTTP acceptance sequence and checked per-version session analytics and v3 action delivery. An isolated two-tab production-build quiz pass verified reload drafts, save-on-Continue, stable assignment, revision conflicts and preserved losing drafts. Found and fixed Start remaining disabled after expired-session recovery, including a shared-cookie bootstrap edge. Rebuilt browser acceptance and the full verify:bun gate passed: 857 Node tests and 440 Bun backend tests. Remote backup is deferred by user decision; no new public deployment is claimed.

### October 8 — Lost responses and observation acknowledgement recovery

Added two real HTTP lost-ack acceptance scenarios and tested quiz Retry/reload/API-outage recovery in an isolated production-build browser. Fixed receipt validation deleting unrelated queued observations and rejection-warning persistence after queue removal. Nine regressions cover invalid receipts, concurrent queue changes and storage failures. Hosted deployment and physical-network/browser-crash behavior are separate from these local checks.

Final integrated npm run verify:bun passed 868 Node tests and 442 Bun backend tests, static checks and production builds. After rebuild, browser observation delivery recovered automatically from a dropped acknowledgement with valid real backend receipts, the warning cleared and the session revision remained unchanged. No new public deployment is implied.
