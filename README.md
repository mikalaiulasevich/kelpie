# Funnel Runtime

A TypeScript/NestJS (Fastify) foundation with a planned Next.js quiz and React/Vite administration application for configurable funnels. Implemented: configuration validation, pure funnel evaluation, the initial Prisma/SQLite schema, backend lifecycle and health endpoints, immutable configuration draft imports, administrator authentication, transactional publication/rollback APIs, signed user sessions, revisioned answer/navigation commands, event batch ingestion, session-based analytics APIs and a frontend readiness screen.

**The product is not complete.** The funnel/administration/dashboard UI, browser delivery queue, synthetic traffic and public deployment remain in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). No public application URL or agreed 48-hour start is recorded.

## Local development

Use Bun 1.3.14 for backend execution and package installation. Node.js 24 and npm 11.19.1 remain required for TypeScript/Prisma tooling and the reviewer fallback. Node.js 26 is allowed by the manifest; current local dual-runtime verification uses Node.js 24.

```sh
npm install --global npm@11.19.1 bun@1.3.14
bun install --frozen-lockfile
npm run database:generate
npm run database:migrate
bun run development:bun
```

For the Node.js/npm-only path, use `npm ci` followed by the same database commands and `npm run development`. After changing dependency manifests, update both `package-lock.json` and `bun.lock`; `trustedDependencies` allows only the required native/Prisma installation scripts.

Bun uses the official `@prisma/adapter-libsql` against a local SQLite file; Node uses `@prisma/adapter-better-sqlite3`. No hosted libSQL/Turso service is used. This follows [Prisma's Bun guidance](https://docs.prisma.io/docs/v7/prisma-orm/quickstart/sqlite#using-sqlite-with-bun); it is not a `bun:sqlite` integration or a measured speedup. Both runtimes use the same database, migrations and ISO timestamp storage. Nest runs the TypeScript compiler output so decorator metadata remains consistent.

Open http://127.0.0.1:5173. Vite proxies `/api` to http://127.0.0.1:3000. The page checks the actual backend; it does not simulate a funnel.

The default database is `applications/backend/data/funnel-runtime.sqlite`. For custom settings, copy `applications/backend/.env.example` to `applications/backend/.env`; relative database paths resolve from the backend directory. If you change backend `HOST` or `PORT`, also update the `/api` proxy target in `applications/frontend/vite.config.ts` to the matching reachable address. Secrets, local data and generated outputs are ignored by Git.

Application files are watched. Restart development after changing shared packages. Ctrl+C stops both applications. Builds clean only their configured workspace output directories before compiling.

| Command                         | Purpose                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `npm run verify`                | Configuration checksums, test layout, lint, formatting, types, tests, builds and Prisma validation |
| `npm run verify:bun`            | Full Node verification followed by the same backend tests on Bun                                   |
| `npm run test:bun`              | Backend Vitest suite running under Bun (Node tooling remains required)                             |
| `npm run build`                 | Build shared packages and applications                                                             |
| `npm run test`                  | Run workspace tests after dependency generation/build setup                                        |
| `npm run database:generate`     | Generate Prisma Client                                                                             |
| `npm run database:migrate`      | Apply checked-in migrations                                                                        |
| `npm run configurations:verify` | Verify original configuration bytes                                                                |
| `npm run benchmark:runtime`     | Build and measure the pure runtime separately from correctness tests                               |

After `npm run build` and migrations, `bun run start:bun` starts the compiled backend on Bun; `npm run start:node` starts the same output on Node. Bun CLI commands are `bun run --cwd applications/backend configurations:import:bun <absolute-json-path>` and `bun run --cwd applications/backend administration:provision:bun`. TLS, routing, secrets, persistent storage and backups still require deployment setup. Hosting remains unresolved; GitHub Pages can serve only the frontend.

## Administrator API

Run migrations before provisioning credentials. Supply `ADMINISTRATION_USERNAME` and `ADMINISTRATION_PASSWORD` through your local secret environment, then run `npm run administration:provision`. The root command builds shared packages and generates Prisma Client before executing provisioning. There is no default password. Provisioning again rotates the single administrator's credentials and revokes existing sessions. Do not put passwords in command arguments, source files or committed environment files.

`ADMINISTRATION_ORIGIN` is the exact browser origin without a trailing slash (development default `http://127.0.0.1:5173`). Production requires an explicit HTTPS origin. Vite proxies the API during development; production should serve the frontend and API on the same origin. Cross-origin CORS and unrelated-domain GitHub Pages cookies are not implemented.

Sign in with JSON `{ "username": "your-name", "password": "your-secret" }` at `POST /api/administration/sign-in`. Every administration mutation, including sign-in, must include the matching `Origin` and `X-Kelpie-Administration: 1` headers. The response sets an HttpOnly, SameSite=Strict cookie scoped to `/api/administration`; production adds Secure. Sessions expire after eight hours. A new sign-in replaces the previous administrator session. Password hashing uses asynchronous scrypt (N=131072, r=8, p=1); only one hash runs at a time, and excess work is rejected rather than queued. Sign-in is limited to five attempts per minute per client IP. Limits are process-local; the backend does not trust forwarded IP headers.

| Endpoint                                                                    | Behavior                                                                                                        |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `GET /api/administration/session`                                           | Current administrator; 401 after expiration/revocation                                                          |
| `POST /api/administration/sign-out`                                         | Revoke current session and clear cookie                                                                         |
| `POST /api/administration/configurations`                                   | Import the supplied configuration JSON as an immutable draft; 422 for invalid data, 409 for conflicting content |
| `GET /api/administration/configurations?funnelIdentifier=workstyle-planner` | Version metadata plus active version and current revision                                                       |
| `POST /api/administration/publications`                                     | Activate a validated draft with optimistic concurrency and idempotency                                          |
| `POST /api/administration/rollbacks`                                        | Activate the preceding version from activation history                                                          |
| `GET /api/administration/publications?funnelIdentifier=workstyle-planner`   | Activation history, newest revision first                                                                       |

A publication body contains `operationIdentifier` (a fresh UUID per intent), `funnelIdentifier`, `targetVersionIdentifier` (the imported version's UUID), and `expectedRevision` (from the list response). Rollback uses the same fields except `targetVersionIdentifier`. Retry the identical body and identifier after a timeout: it returns the originally persisted result, even if later commands changed the active version. Reusing an identifier for another intent or supplying a stale revision returns 409. A replay does not represent the latest active state; fetch the list again. Publishing the already-active version is rejected. Rollback records another activation, so rolling back again returns to the version active immediately before that rollback.

Lists accept `limit` (default 25, maximum 100) and `offset` (maximum 10000); responses include `nextOffset`. Each page is a consistent database snapshot, but separate pages may shift while new records are added. Responses contain metadata rather than whole configuration documents. All administrator routes require authentication except sign-in. Responses use `Cache-Control: no-store`; errors include a safe `code`, `message`, `statusCode` and server-owned `requestIdentifier`, with bounded validation `issues` where applicable.

Publication changes the active pointer and appends history in one SQLite transaction. It never modifies pinned sessions, raw answers or events. The revision migration preserves prior history and breaks existing timestamp ties by insertion order. Backend integration tests exercise old-session continuation after publication and rollback; the administration interface and browser acceptance remain pending.

## User-session API

First call `GET /api/sessions/current` and retain its cookie before creating a session. The handshake returns `{ "state": null, "expired": false }` without creating a funnel session or event. With a valid existing session it returns `{ "state": <session state>, "expired": false }`; expiration returns null state, `expired: true`, and a replacement bootstrap cookie. Browser first-open coordination across tabs is still frontend work.

All session mutations require the exact `Origin` configured by `ADMINISTRATION_ORIGIN` and `X-Kelpie-Session: 1`. This shared origin setting covers both APIs. Public session identifiers and operation identifiers never authorize requests. Responses disable caching.

| Endpoint                              | JSON body                                                    | Response                                 |
| ------------------------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| `POST /api/sessions`                  | `operationIdentifier`, `funnelIdentifier`, `clientTimestamp` | 201, initial session state               |
| `POST /api/sessions/current/answers`  | Common command fields plus `answer`                          | 200, confirmed answer and advanced state |
| `POST /api/sessions/current/continue` | Common command fields                                        | 200, advance from an information screen  |
| `POST /api/sessions/current/back`     | Common command fields                                        | 200, previous available step             |

Common command fields are `operationIdentifier` (UUID), `expectedSessionRevision`, `stepIdentifier` (the current step), and `clientTimestamp` (canonical UTC ISO text, for example `2026-10-07T10:00:00.000Z`). Creation omits the revision and step. Creation query parameters accept bounded `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` and the pinned configuration's override parameter (`variant=A` or `variant=B` in supplied files). Assignment is server-side, weighted and stable; overrides are marked forced. New sessions pin the active version transactionally.

State contains session/version/funnel identifiers, funnel version, variant, pinned configuration, revision, current step, retained answers with `confirmationRevision`, visible progress and an eligible result or null. Answer values and confirmation are separate: hiding a branch clears confirmation while retaining its values, including explicit null. Unconfirmed values stay inactive until resubmission. Browser drafts are not yet implemented; clients must persist unfinished inputs separately and submit only on explicit Continue.

Retry an uncertain command with the identical body and operation identifier. Ownership and expiry are checked before replay; an identical retry returns its original committed revision. Changed intent returns `operation_conflict`; an outdated revision returns `stale_revision` (409). Fetch current state before replacing newer UI state with an older replay. Invalid answers return 422 without changing state. Answers, revision, navigation transition, authoritative events and the replay response commit atomically. Creation stores an initial snapshot and `session_started`; answer/Back events contain bounded metadata, never raw answers. Information Continue records a forward transition without inventing an answer event. Client observations use the event batch API below; the browser delivery queue remains pending.

The `kelpie_session` cookie is HttpOnly, SameSite=Strict, scoped to `/api`, and Secure in production. Its HMAC signing key is generated once and persisted in `ApplicationSecret`; storage keeps credential hashes, not plaintext browser cookies. Creation/replay renew the same cookie to the remaining configured session lifetime (72 hours in supplied configurations), without extending server expiry. Preserve the database, including its signing key, in protected backups; losing the key invalidates existing cookies. Backup/restore drills remain pending.

## Event ingestion API

`POST /api/events/batches` accepts `{ "events": [...] }` with 1–50 elements and the same session cookie, exact Origin and `X-Kelpie-Session: 1` as session commands. Each element has `event_id` (UUID), `session_id`, `name`, `client_timestamp` (canonical UTC ISO), `step_id`, `observationRevision` and `properties`. The revision identifies the committed state in which the event was observed, including revision 0 for initial state. An old revision can remain eligible after the user changes branches or a newer configuration is published.

| Client event              | Required properties                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `step_viewed`             | `step_type`, `visible_step_index` (zero-based), `visible_step_count` (all available route screens)                                  |
| `result_viewed`           | `result_id`                                                                                                                         |
| `cta_clicked`             | `result_id`, `action`                                                                                                               |
| `recommendation_expanded` | `result_id`, `action: "expand_recommendation"`, `source: "primary_cta"`; requires that action and declaration in the pinned version |

The backend checks the exact historical current screen, eligible result and configured action. These checks establish permitted state, not proof of human viewing. Server-owned `session_started`, `answer_submitted`, `step_completed` and `back_clicked` cannot be submitted by clients. Undeclared properties, raw answers and contradictory metadata are rejected. Optional `funnel_id`, `funnel_version`, `experiment_id`, `variant` and the five UTM fields must match the immutable session; omitting them lets the backend derive them. Event storage joins the immutable session/version for this metadata and stores both timestamps and observation revision.

The response is `{ "receipts": [...] }`, preserving each input `position`. Accepted/duplicate receipts contain `event_id`, `status` and the original `server_timestamp`; rejected receipts contain a stable `code` and the identifier only when valid. One invalid element does not discard valid siblings. Identical replay is a duplicate; changed content under the same identifier is a conflict, including cross-owner collisions without disclosing another session. Authentication and expiry are checked before sensitive replay.

Each valid element commits independently. A timeout or server error can therefore mean an earlier prefix committed: retry the unchanged batch with the same identifiers and client timestamps. Only accepted/duplicate receipts acknowledge storage. A verified Prisma operation timeout, including SQLite writer contention, returns 503 with `Retry-After: 1`; unexpected storage failures remain 500. Preserve the original identifiers for either unknown outcome. Ingestion is limited to 60 requests per minute per IP and the shared 256 KiB body limit. Browser queue persistence, backoff and unsent-event recovery remain frontend work.

## Analytics API

`GET /api/administration/analytics?funnelIdentifier=workstyle-planner` requires the administrator cookie. Optional filters: `versionIdentifier`, acquisition `campaign`, `includeForced=true|false` (default false), and `trafficOrigin=production|synthetic|all` (default production). Version pages use `limit` (default 10, maximum 20) and `offset` (maximum 10000); `pagination.hasMore` identifies another page. Both variants appear even when they have no traffic. The endpoint is limited to 30 requests per minute per IP and disables caching.

The response contains `generatedAt`, resolved filters, pagination and separate version/experiment/variant groups. Each group includes `started`, `resultCompletion`, `ctaConversion`, `ctaClickThrough`, ordered `steps` with conditional markers, and historical forward `edges`. Every ratio contains `numerator`, `denominator` and fractional `value`; a zero denominator returns null. Result screens have reach only, with no completion/dropout row.

SQLite counts unique session sets. Starts require the persisted session and authoritative start event. Step completion intersects observed viewers with authoritative forward transitions; information Continue counts as a transition. Noncompletion is split into open sessions and expired dropout. CTA conversion divides clickers by starters; CTA CTR divides sessions with both result and CTA observations by result viewers. Edge metrics distinguish observed source-to-destination conversion, branch share, transition-to-view conversion and open/expired destination nonreach. Repeated views, Back, duplicate identifiers and arrival order do not increase these counts. Branch shares can sum above 100% when a session changes branches. [The plan](IMPLEMENTATION_PLAN.md#analytics-definitions) defines the exact sets and denominators.

The API aggregates in SQLite rather than loading individual event rows into Node.js. It returns bounded version pages; the underlying database still processes matching historical facts. A read transaction provides one consistent snapshot, but its timeout cannot interrupt a synchronous SQLite statement. Query-plan checks exercise the existing session/event/transition indexes. No throughput benchmark, analytics UI or synthetic traffic command is included yet.

## Repository map

```text
applications/backend       NestJS, SQLite lifecycle, health and diagnostics
applications/frontend      React/Vite administration target; current readiness screen
applications/quiz          Planned separate Next.js quiz (not scaffolded yet)
packages/contracts         TypeBox/Ajv schemas and semantic validation
packages/funnel-runtime    Answers, conditions, variants, routes and results
configurations             Original JSON and SHA-256 manifest
scripts                    Development, clean builds and integrity checks
documentation              Decisions, measurements and development evidence
```

Backend feature ownership follows Nest modules: administration, configurations, publications, sessions, events, analytics and health. Each owns its controllers and providers. `DatabaseModule` exports the shared database service; `EnvironmentModule.register` provides application-local configuration globally once at bootstrap. `TransportModule` registers the global exception filter. `ApplicationModule` composes these modules and owns shutdown coordination. Stateless schemas, policies and operations remain ordinary domain imports.

[AGENTS.md](AGENTS.md) owns coding/review conventions. Tests and support files live under each workspace's `tests/` directory. [The engineering review](documentation/foundation-review.md) explains architectural decisions, complexity and performance evidence; [the development log](documentation/development-log.md) records milestones. [The audit manifest](documentation/file-audit.json) contains current file hashes and verification scope, not a permanent correctness guarantee.

## Configurations and runtime

The supplied files remain byte-identical and all use schema version 1.0:

| Version | Purpose                                                                       |
| ------- | ----------------------------------------------------------------------------- |
| v1      | Base flow and conditional office-days question                                |
| v2      | Meeting-hours question and meeting-heavy result                               |
| v3      | Compliance branch, tool count omitted from B, `recommendation_expanded` event |

Validation checks bounded JSON structure, references, condition types/order, merged content, result rules, weights and event declarations. Trigger prose is data, never executable code. Runtime operations require validated configurations.

Use `FunnelRuntime.Evaluation.evaluate(configuration, variant, answers)` when both route and result are needed; it computes them with one route traversal. Hidden, omitted and invalid answers cannot influence active routing/results. Required unanswered questions block results even when excluded from progress. The session command layer separately tracks confirmation revisions: hidden answers remain stored but cannot drive routing or results until explicitly confirmed again.

The initial database schema separates answers from events and constrains version, operation and event identities. Backend services now enforce authorization, immutable imports, transactional commands and retry-safe replay. Client observational events and analytical aggregation remain planned.

**Experiment hypothesis:** B increases the share of started sessions opening recommendations through question order and result framing. The primary metric is unique CTA-clicking sessions / unique started sessions; result completion and CTA CTR among result viewers are secondary. Compare within one version/experiment, excluding forced assignments by default. Synthetic traffic will verify calculations, not prove the hypothesis.

## Configuration draft import

After applying migrations, import a supplied configuration into the local database:

```sh
npm run configurations:import -- "$PWD/configurations/funnel-v1.json"
```

Use an absolute file path: the command runs in the backend workspace. It prints version metadata and `created` or `existing`, without the document. All three supplied files are supported. Import validates and snapshots the configuration, hashes canonical JSON (object key order is ignored; array order is preserved), and writes an immutable draft. Repeating the same content returns the same record; changing content under the same funnel/version fails. A configuration's `status` field never activates it. The checksum here identifies canonical content; provenance checksums under `configurations/` still identify the original file bytes.

This is a trusted local operator command with database filesystem access. No unauthenticated import endpoint is exposed. Authenticated administrator HTTP import, publication and rollback are also available as described above. Failure returns a nonzero exit code; correct the input or storage failure before retrying. A committed import is safe to repeat after a lost command result.

## Diagnostics and troubleshooting

The backend emits structured JSON to stderr. Requests reaching middleware receive a server-generated `x-request-id`; completion records include the registered route template, method, status and duration. Aborted connections are distinguished. Node-level HTTP parser failures occur before this correlation.

Pino writes structured JSON diagnostics to stderr with ISO `time`, string `level`, event and the server-owned request identifier where available. Set `LOG_LEVEL=trace|debug|info|warn|error|fatal` (default `info`); invalid values fail startup without echoing the supplied value. NestJS uses the same logger through `LoggerService`; Fastify request hooks emit one completion/abort event without enabling duplicate raw request logs.

The configuration import command keeps its machine-readable result on stdout; failures use the same Pino sink on stderr. Framework records retain a fixed message, an allowlisted context and sanitized error metadata; arbitrary Nest strings and optional arguments are deliberately excluded. Backend `console.*` calls are rejected by ESLint.

Logs omit bodies, raw URLs, cookies, credentials, arbitrary error messages and absolute paths. Error codes/messages are allowlisted. Diagnostics never read the supplied error stack: they capture a fresh server-owned stack and hash its bounded locations. Frames and fingerprints identify the reporting site within the matching build, not the original throw site.

For a local diagnostic session after build/migration:

```sh
cd applications/backend
mkdir -p data
umask 077
node distribution/source/main.js 2>data/backend.jsonl
```

With `jq` installed, from the same directory:

```sh
jq -R 'fromjson? | select(.requestIdentifier == "REPLACE_WITH_RESPONSE_REQUEST_ID")' data/backend.jsonl
jq -R 'fromjson? | select(.level == "error")' data/backend.jsonl
```

| Event                        | Next action                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| `application_failed`         | Inspect `phase`, safe error code/message; resolve settings, occupied port or database setup and restart |
| `readiness_failed`           | Check migrations, disk access/capacity and contention; readiness can recover without restart            |
| `shutdown_deadline_exceeded` | Connections exceeded the ten-second drain deadline; inspect stalled requests                            |
| `records_dropped`            | Log destination is backpressured; inspect the collector and its capacity                                |

The drain deadline cannot interrupt synchronous SQLite work. Backpressure drops logs instead of buffering indefinitely; a failed destination disables writes. Deployment owns log rotation, quotas, retention and process supervision. Logs are not a durable audit ledger.

## Security and verification boundaries

Implemented controls include validated environment input, loopback binding by default, body limits, security headers, server timeouts, redacted exceptions and database/migration readiness. Compressed JSON is unsupported (415). Frontend Ky requests have cancellation, no retries and a five-second total deadline.

Administrator authentication, origin/header CSRF checks, sign-in throttling and publication command idempotency are implemented. User-session authorization, revision checks and command replay are also implemented. Tested backup/restore, browser coordination and public hosting remain pending. SQLite targets one backend instance with persistent storage. Dependency override rationale is in [the engineering review](documentation/foundation-review.md#dependency-decisions); avoid unreviewed `npm audit fix --force` changes.

Local verification is not deployed/browser acceptance. The last documented remote CI attempt failed before jobs started; a current remote CI result has not been established. Follow the implementation plan's acceptance gates before claiming delivery.
