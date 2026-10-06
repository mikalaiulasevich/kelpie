# Funnel Runtime implementation plan

Build a configurable funnel platform with reliable session state, immutable configuration versions, server-assigned experiments, idempotent events, and analytics based on unique sessions. Use professional engineering practices within the assignment's single-server SQLite constraints.

This plan records agreed decisions and acceptance criteria. The 48-hour window begins at an explicitly agreed start; no start time has been recorded. The foundation is implemented; current verification and measurements are recorded in documentation/development-log.md. The full platform and public deployment remain pending.

## Agreed stack and product decisions

| Area                     | Decision                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------- |
| Backend                  | NestJS and TypeScript                                                               |
| Frontend                 | React, Vite, and TypeScript                                                         |
| Persistence              | Prisma and SQLite                                                                   |
| Interface                | Tailwind CSS and shadcn/ui; restrained SaaS presentation                            |
| Language                 | English interfaces and README; configuration locale en-AU                           |
| Architecture             | Modular monolith in one repository                                                  |
| Session state            | Backend stores confirmed answers, current step, version, and variant                |
| Draft input              | Browser persistence only; backend saves on Continue                                 |
| Navigation               | Explicit Continue on every question; accessible Back                                |
| Hidden answers           | Retained as inactive values; excluded from active routing and results               |
| Administration           | One administrator with password sign-in and server-side sessions                    |
| Configuration management | JSON upload, validation, draft, explicit publication, publication history, rollback |
| Experiment override      | Assigned only at session creation; excluded from experiment comparison by default   |
| Synthetic traffic        | Explicitly marked and separately filterable                                         |
| Hosting                  | Free hosting to be selected later; persistent SQLite storage is required            |

GitHub Pages was requested for frontend hosting. It cannot run NestJS or persist SQLite. Prefer one origin for frontend and backend when selecting hosting; if GitHub Pages remains necessary, resolve browser cookie compatibility and domains explicitly before deployment. Do not assume unrelated-domain cookie sessions work reliably.

## Repository structure

```text
applications/backend
applications/frontend
packages/contracts
packages/funnel-runtime
configurations
scripts
```

Backend modules cover configuration management, publications, sessions, experiment assignment, event ingestion, analytics, and administrator access. Frontend areas cover the funnel, administration, and analytics. Shared packages must not depend on NestJS, React, Prisma, or browser globals.

Use full names in authored code. Preserve external field names such as event_id and funnel_version exactly at contract boundaries. Exact dependency versions and package management tooling are pinned in package manifests and package-lock.json.

## Source configurations and iteration mapping

| File           | Changes                                                                     | Role                                             |
| -------------- | --------------------------------------------------------------------------- | ------------------------------------------------ |
| funnel-v1.json | Base flow; conditional office_days; A/B order, copy, and result framing     | First working release                            |
| funnel-v2.json | meeting_hours and meeting_heavy result                                      | Intermediate publication and compatibility check |
| funnel-v3.json | Compliance branch, tool_count omitted from B, recommendation_expanded event | Assignment second iteration                      |

All supplied files use schemaVersion 1.0. Preserve their contents when copying them from Downloads into configurations. Record checksums for provenance. Their status fields are import metadata, not authority to publish automatically.

Acceptance requires at least six defined screens and at least one conditional branch. Verify these requirements against each published supplied configuration and exercise both outcomes of its branch; variant sequences may intentionally omit a defined screen.

No visual configuration editor is required. Dynamic screens mean reusable renderers for info, single-select, multi-select, number, and result; there must be no funnel-specific hardcoded question screens.

## Configuration validation and runtime

Validate JSON structure with a versioned schema and perform semantic validation separately. Return bounded errors containing a field path and actionable message. Limit document size, collection lengths, string lengths, and condition nesting before evaluation.

Validate identifiers, sequence uniqueness, referenced steps and results, overrides, weights, numeric constraints, selection limits, supported actions, declared events, and privacy rules. Reject duplicate versions with different contents. An exact repeated import may return the existing draft without creating another record.

Require conditions to reference compatible answer types and earlier reachable steps in each variant. Reject future dependencies, invalid references, and cycles. Do not require every defined step to appear in every variant: v3 intentionally omits tool_count from B. Check merged variant configurations, not only the base document.

Expose pure operations through cohesive domain objects:

```text
FunnelConfigurations.validate
ExperimentResolution.resolve
ConditionEvaluation.evaluate
RouteResolution.resolve
AnswerValidation.validate
RouteResolution.next
RouteResolution.previous
ResultResolution.resolve
```

Resolve visibility in sequence order using only answers from currently available steps. Unknown dependencies do not satisfy a visibility condition. Inactive answers cannot activate downstream branches. Resolve result rules in document order; first matching rule wins, otherwise use defaultResultId.

Validate numeric finiteness, minimum, maximum, increment alignment, allowed selections, selection uniqueness, and required values. Both frontend and backend use the same rules; backend remains authoritative.

Target one route traversal with time O(S + C), where S is step count and C includes traversed condition elements and collection membership work. Avoid repeated traversal per renderer. Bound condition depth and answer collection sizes. Record actual complexity when implementation differs.

Progress counts currently available question steps and honors excludeTypes. Unknown branches are not counted until they become available; the displayed total may change after an answer. Do not promise a fixed final question count before branching answers exist.

## Persistence model

| Entity               | Responsibilities                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Funnel               | Stable funnel identity and active configuration reference                                                                      |
| FunnelVersion        | Unique funnel/version pair, immutable document, schema version, checksum                                                       |
| Publication          | Activation and rollback history, administrator, timestamp, previous and target version                                         |
| Session              | Pinned version and experiment, assigned variant and assignment source, UTM, traffic origin, current step, revision, expiration |
| SessionAnswer        | Retained answer value and nullable confirmation revision; active status derived from runtime                                   |
| SessionTransition    | Immutable session, operation, resulting revision, kind, source step and destination step; server timestamp                     |
| SessionOperation     | Operation identifier, request fingerprint, stored response, ownership                                                          |
| Event                | Unique event identifier, content fingerprint, session reference, source, timestamps, step, allowlisted properties              |
| Administrator        | Single administrator identity and password hash                                                                                |
| AdministratorSession | Hashed authentication token, expiration, revocation                                                                            |

JSON documents and answer values permit new configuration content without per-question database migrations. Application schema migrations are still required when application entities change. Version numbers and event identifiers have database uniqueness constraints; relationships use foreign keys.

Public session identifiers and secret access tokens are distinct. Store access tokens as hashes. Cookie policies require HTTPS, HttpOnly, Secure, explicit SameSite, narrow scope, and server-enforced expiration. Retain analytical records independently of deleting expired session secrets and raw answers; define and document the cleanup policy.

## Publication and rollback

Import a valid configuration as an immutable draft. Validate again before activation. Create the publication record and switch the active reference in one transaction. Session creation reads and pins the active reference with transactional consistency so it receives exactly one published version.

Rollback targets the previous activation in publication history, not version minus one. Record the change as another publication action. Use an expected active reference or revision to prevent two administrator actions from silently overwriting one another.

Never rewrite an existing session's version or variant. Preserve referenced versions for sessions and historical analytics. No migration or deletion of existing analytical data is part of publishing v3 or rolling back.

## Session commands and concurrency

Create a new session idempotently, assign a variant once using server-side weighted randomness, capture immutable acquisition UTM, and persist session_started atomically. Refresh and reopening resume the existing valid session. A recognized override query parameter affects only new sessions and is marked forced.

Mutation requests contain operationIdentifier and expectedSessionRevision. Check for a previous operation before checking revision. An identical retry returns the original response; a reused identifier with different content returns a conflict. Persist the state transition, authoritative events, and operation result atomically.

Submitting an answer validates the currently available step, updates confirmed answers, recomputes routing, advances appropriately, and increments revision. Back also runs on the backend and records its transition. Failed validation produces no completion event. Continue from an information screen records an authoritative forward transition without inventing answer_submitted or interactive step_completed events. Persist SessionTransition for every successful navigation command, including Back, in the same transaction as state and SessionOperation; enforce uniqueness by session and resulting revision. Its operation reference identifies the accepted command. Transition kinds distinguish forward, back, and route correction; only forward transitions count as completion. Configuration event declarations remain unchanged.

Persist local drafts immediately under session/version/step keys. Remove a draft only after successful server confirmation, explicit replacement, or expiration. Preserve operation identifiers across uncertain retries. A stale revision triggers a fresh state read and a visible conflict resolution; do not silently overwrite another tab or discard a draft.

When recomputing the route hides a step, retain its answer value but atomically clear its confirmation revision. A hidden or unconfirmed value cannot influence downstream visibility or results. Reopened steps display the retained value as input awaiting confirmation; only a successful explicit Continue sets the confirmation revision to the resulting session revision. The response exposes this status separately from the retained value so refresh cannot accidentally reconfirm it. Answers that remain available and valid keep their confirmation. Recalculate results after relevant changes and require available required questions to have valid confirmed answers before showing a valid result. Optional unanswered questions do not block result eligibility; retained unconfirmed optional values remain inactive until reconfirmed. Browser Back and Forward must resolve to allowed steps through the same session rules.

After the configured 72-hour lifetime, create a new session and explain expiration. Reopening in the same browser is supported; cross-device recovery without authentication is outside scope.

## Request boundaries

```text
POST /sessions
GET  /sessions/current
POST /sessions/current/answers
POST /sessions/current/continue
POST /sessions/current/back
POST /events/batches

POST /administration/sign-in
POST /administration/sign-out
GET  /administration/configurations
POST /administration/configurations
POST /administration/publications
POST /administration/rollbacks
GET  /administration/analytics
```

Resolve authorized session ownership from cookies. Client identifiers alone never grant access. Return server state, revision, pinned configuration, confirmed answers, and current progress. Prevent shared caching of sensitive responses. Document request and response contracts and error handling before frontend/backend parallel work.

## Events and idempotent ingestion

Support session_started, step_viewed, answer_submitted, step_completed, back_clicked, result_viewed, and cta_clicked. Support v3 recommendation_expanded through the existing expand_recommendation action handler when declared by the pinned configuration.

Each event has event_id, session_id, client_timestamp, server_timestamp, funnel_id, funnel_version, experiment_id, variant, step_id when applicable, acquisition UTM, and bounded event-specific properties. session_started has no step. Treat server_timestamp as receipt time and client_timestamp as untrusted occurrence metadata.

Create authoritative session and answer transition events on the server. Client ingestion cannot claim server-only events. Authenticate ownership and derive version, variant, experiment, and UTM from the session, rejecting supplied contradictory values.

Validate each batch element independently against its pinned version's event declarations. Allow only declared properties with runtime type and size checks. Trigger prose in the configuration is descriptive, not executable. Arbitrary new behavior requires a supported declarative trigger contract; v3 only needs its known action.

Return per-element accepted, duplicate, or rejected receipts. Enforce uniqueness in the database. Identical event identifiers and content are duplicates; different content under an existing identifier is rejected. A malformed element must not discard valid elements. A malformed batch envelope may reject the request; transient storage failure remains retryable.

Keep a persistent browser queue with stable event identifiers. Retry bounded batches with backoff and jitter. Delete accepted or duplicate items only after receipts; separate permanent rejection from retryable failure. Unload delivery is best effort, and unacknowledged items remain queued for reopening. State the unavoidable limitation if a browser never returns with unsent events.

Raw answers never enter analytics properties or logs. answer_submitted carries answer_kind rather than the answer. Client UI observations do not constitute fraud-proof behavioral evidence; state transitions are authoritative.

## Analytics definitions

Use session sets, not event counts. Start cohorts from persisted sessions and their atomic session_started event. Keep version, variant, campaign, assignment source, and synthetic origin filters consistent across numerators and denominators.

For a selected cohort, let C be its session set, V(s) the sessions with a valid step_viewed observation for step s, F(s) the sessions with an authoritative forward transition leaving s, R the sessions with result_viewed, K the sessions with cta_clicked, and X the expired sessions. Intersect every set with C. The result is terminal and has no completion/dropout row. A forward transition completes either an interactive or an information step; step_completed remains an interactive configuration event. Sets retain historical facts across revisions.

| Metric                 | Definition                                            |
| ---------------------- | ----------------------------------------------------- |
| Started                | Count of C                                            |
| Step reached           | Count of V(s)                                         |
| Step completed         | Count of F(s), including information-screen Continue  |
| Step completion        | Count of V(s) ∩ F(s) / count of V(s)                  |
| Observed noncompletion | V(s) minus F(s), split into open and expired sessions |
| Expired dropout        | Count of X ∩ (V(s) minus F(s)) / count of X ∩ V(s)    |
| Result completion      | Count of R / count of C                               |
| CTA conversion         | Count of K / count of C                               |
| CTA CTR                | Count of R ∩ K / count of R                           |

Open noncompletion is pending, not definitive dropout. Expired dropout is an observed metric: late queued observations may revise it. Session expiration is server-enforced. Every ratio displays numerator and denominator; a zero denominator renders “Not applicable”, never zero percent or a fabricated conversion.

For source s and destination d, E(s,d) is the set of sessions whose persisted forward transition explicitly connects s to d. Define observed edge conversion as count of V(s) ∩ E(s,d) ∩ V(d) / count of V(s); show it as the share of source viewers reaching that specific destination, not as failure on alternative branches. Define branch share as count of E(s,d) / count of F(s), and transition-to-view conversion as count of E(s,d) ∩ V(d) / count of E(s,d). Destination nonreach is E(s,d) minus V(d), split into open and expired sessions. Users routed elsewhere are excluded from that destination's denominator. For an unconditional edge, branch share is normally 100%; destination viewing remains a separate observation that can arrive later.

A session changing branches may belong to multiple edge sets; branch shares therefore need not sum to 100%. Preserve edges as originally committed rather than reconstructing them from current answers, timestamps, or event arrival order. These are historical session reach metrics, not attribution to a particular viewing attempt; show this qualification alongside branch comparisons.

Render separate ordered funnels for each version and variant. Show conditional branches explicitly. Repeated views, Back, duplicate events, and receipt order do not increase session counts. Preserve historical step reach when answers change. Cohort transitions need not form a single monotone funnel after users revisit and change branches; label the definitions rather than forcing misleading percentages.

Compare A/B only within a version and experiment. Main hypothesis: B increases the share of started sessions opening recommendations through improved question order and result framing. Primary metric is CTA conversion. Result completion and CTA CTR are secondary diagnostics. Synthetic traffic checks calculations; it does not establish experimental effectiveness. Across-version comparisons are descriptive, not causal.

Default A/B comparison excludes forced assignments. Synthetic traffic is explicitly selectable; a fresh generated demonstration opens with a visible synthetic-data selection. Campaign filtering uses acquisition UTM captured once at creation.

Aggregate in SQLite using indexed queries; do not load all events into Node.js. Use pagination for history. Inspect query plans before adding compound indexes. Bound work and transaction durations; do not precompute counters that diverge under late events without a reconciliation design.

## Security and operational requirements

Use a single administrator, a vetted password hashing implementation, persistent revocable administrator sessions, sign-in throttling, and authorization on every internal endpoint. Bootstrap credentials from secrets without committing a default password. Prevent username/password and token leakage in logs.

Protect cookie-authorized mutations from CSRF. Restrict cross-origin access if needed, apply security headers, prevent configuration content from injecting HTML, and set upload/body/batch limits. React text rendering must not become arbitrary HTML execution.

Use persistent local storage for SQLite, controlled write concurrency, foreign keys, and a deliberate journal/busy-timeout configuration compatible with the selected Prisma version. Verify settings rather than assuming WAL alone resolves contention. Keep deployments to one application instance unless architecture changes explicitly.

Provide health/readiness checks, structured redacted logs, graceful shutdown, migrations, safe consistent database backups, and a demonstrated restore. A persistent disk is not a backup. Verify that redeployment preserves the database. Document recovery steps and single-server limits.

## Tests and traffic generation

Use focused unit tests for pure runtime functions, integration tests against real temporary SQLite databases, and browser tests for complete flows. Select compatible test tooling during bootstrap and pin it. Test failure paths and observable invariants rather than mirroring implementation details.

Required automated coverage:

- Session version remains pinned after new publication and rollback.
- Assignment remains stable after refresh; override cannot reassign an existing session.
- Publication and rollback history are atomic and conflict-safe.
- New sessions during activation receive a valid complete version.
- Identical events deduplicate; conflicting reuse is rejected.
- Valid batch elements survive invalid neighbors and batch retry.
- Lost response and concurrent duplicate operations do not duplicate state transitions.
- Two tabs produce a detectable revision conflict.
- Hidden answers do not affect conditions or results; exercise hide → restore → refresh → explicit confirmation, including downstream branches and result access.
- Configuration references, merged overrides, numeric bounds, and condition limits are enforced.
- Analytics match manually derived session sets despite repeats and shuffled arrivals, information-screen Continue, branch changes, zero denominators, and open versus expired noncompletion.
- Administrator and user-session isolation, CSRF, and input limits are enforced.

Generate at least 100 synthetic sessions through actual backend boundaries. Use a seeded generator for reproducible choices, while retaining production assignment behavior unless explicitly testing override. Cover all supplied versions, A/B, both conditional branches, different UTM values, result types, CTA actions, and multiple dropout positions.

Include repeated observations with new identifiers, identical duplicates, a repeated batch, invalid neighbors, shuffled delivery, Back, and answer changes. Ensure enough non-forced synthetic sessions are included in default A/B comparison.

Write an independently derived expected-metrics summary and compare it with analytics responses. Do not calculate expected values using the same aggregation implementation being tested. Keep a small hand-verifiable fixture alongside the larger generator.

Within the final verification budget, benchmark a larger reproducible dataset in addition to the minimum demonstration. Record hardware, dataset size, query plans, latency distributions, memory use, and concurrency settings. Establish budgets from the deployment environment, then check answer submission, ingestion, dashboard queries, and frontend responsiveness. Timebox extended library comparisons and micro-optimization to one hour within the performance allocation; defer them if mandatory functional or security gates are incomplete. Correctness, bounded inputs, index checks, and required regression tests are not optional performance experiments. Do not claim unmeasured scalability.

## Delivery sequence and acceptance gates

| Elapsed budget | Work                                                        | Acceptance gate                                                                                                                             |
| -------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–6 hours      | Contracts, runtime, persistence design, hosting feasibility | Configurations and routes pass; select hosting and smoke-test public frontend/backend access, cookies, and persistent SQLite across restart |
| 6–16 hours     | Persistence, sessions, first funnel                         | v1 works end to end with Back, refresh, drafts, sticky assignment, and pinned version                                                       |
| 16–24 hours    | Administration, activation, rollback, events                | Authorized version changes and retry-safe commands/batches pass integration checks                                                          |
| 24–32 hours    | Analytics and traffic generation                            | At least 100 sessions produce independently verified metrics                                                                                |
| 32–38 hours    | v2 and v3 publication, compatibility, rollback              | Old sessions survive; new sessions use v3; rollback restores v2 for new sessions                                                            |
| 38–44 hours    | Regression, security, performance, deployment               | Public flows work; database survives restart/redeployment; backup restores                                                                  |
| 44–48 hours    | README, actual timeline, limitations, delivery audit        | Working URL, repository URL, commands, contracts, metrics, and evidence are documented                                                      |

Second-iteration acceptance is an explicit sequence:

1. Complete v1, publish v2, and retain unfinished sessions from both versions and variants.
2. Publish v3 without changing the database schema. New sessions receive v3; existing v1/v2 sessions retain their configuration, variant, and working route.
3. Exercise the added compliance branch, verify tool_count is absent from B, and ingest recommendation_expanded through its declared action. Reject that event for v1/v2 sessions, whose pinned configurations do not declare it.
4. Leave a v3 session unfinished, record independently expected analytics, then roll back to v2. New sessions receive v2; all retained v1/v2/v3 sessions still resume and complete on their pinned versions. The declared v3 event remains valid for the retained v3 session.
5. Verify historical versions, transitions, and events remain stored; prior analytics are preserved, with only subsequent legitimate activity changing aggregates. Repeat the publication/rollback path through the internal page and real integration tests.

The schedule is a planning budget, not an actual development log. Record real milestones as work occurs.

After contracts are stable, delegate frontend, backend, and independent verification with explicit file ownership. A dedicated integration/review pass checks all five dimensions: requirements, security, idempotency, complexity, and measured performance. Avoid simultaneous edits to shared contracts without coordination.

## Final deliverables and unresolved decisions

Provide a public working application URL, repository URL, English README, reproducible local commands, model and event schema documentation, exact aggregation rules, experiment hypothesis, actual first/second iteration timeline, and known limitations. Include concise development and review evidence for the assignment's agent-process criterion.

Hosting provider, public domains, deployment-specific performance budgets, and secret provisioning remain to be selected. The repository remote, dependency versions, and Vitest test runner are already configured. These do not block pure runtime work. Resolve hosting in the initial feasibility gate; if a free host cannot provide persistent storage or the chosen frontend/backend origins cannot support reliable cookies, record the constraint and choose a compatible deployment before building against that assumption. Repeat the public persistence and backup/restore checks at final acceptance.

Do not mark the assignment complete until v1, v2, and v3 are verified, historical sessions remain compatible, rollback preserves analytics, the generator is independently checked, and the public application survives its required persistence checks.
