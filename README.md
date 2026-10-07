# Funnel Runtime

A TypeScript/NestJS (Fastify)/React foundation for configurable funnels. Implemented: configuration validation, pure funnel evaluation, the initial Prisma/SQLite schema, backend lifecycle and health endpoints, immutable configuration draft imports, administrator authentication, transactional publication/rollback APIs, and a frontend readiness screen.

**The product is not complete.** Session commands, the administration UI, event ingestion, analytics, synthetic traffic and public deployment remain in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). No public application URL or agreed 48-hour start is recorded.

## Local development

Use Node.js 24 and npm 11; the repository pins npm 11.19.1. Node.js 26 is also allowed by the package manifest, but recent verification used Node.js 24.

Bun is the requested primary backend runtime; migration is pending. Current startup commands execute Node.js and Prisma uses `@prisma/adapter-better-sqlite3`. The checked-in `bun.lock` alone does not establish runtime compatibility.

```sh
npm install --global npm@11.19.1
npm ci
npm run database:generate
npm run database:migrate
npm run development
```

Open http://127.0.0.1:5173. Vite proxies `/api` to http://127.0.0.1:3000. The page checks the actual backend; it does not simulate a funnel.

The default database is `applications/backend/data/funnel-runtime.sqlite`. For custom settings, copy `applications/backend/.env.example` to `applications/backend/.env`; relative database paths resolve from the backend directory. If you change backend `HOST` or `PORT`, also update the `/api` proxy target in `applications/frontend/vite.config.ts` to the matching reachable address. Secrets, local data and generated outputs are ignored by Git.

Application files are watched. Restart development after changing shared packages. Ctrl+C stops both applications. Builds clean only their configured workspace output directories before compiling.

| Command                         | Purpose                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `npm run verify`                | Configuration checksums, test layout, lint, formatting, types, tests, builds and Prisma validation |
| `npm run build`                 | Build shared packages and applications                                                             |
| `npm run test`                  | Run workspace tests after dependency generation/build setup                                        |
| `npm run database:generate`     | Generate Prisma Client                                                                             |
| `npm run database:migrate`      | Apply checked-in migrations                                                                        |
| `npm run configurations:verify` | Verify original configuration bytes                                                                |
| `npm run benchmark:runtime`     | Build and measure the pure runtime separately from correctness tests                               |

After building and migrating, `npm run start --workspace=@kelpie/backend` starts the compiled backend. TLS, routing, secrets, persistent storage and backups still require deployment setup. Hosting remains unresolved; GitHub Pages can serve only the frontend.

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

Publication changes the active pointer and appends history in one SQLite transaction. It never modifies pinned sessions, raw answers or events. The revision migration preserves prior history and breaks existing timestamp ties by insertion order. The administration interface and full old-session continuation scenario will be added with the corresponding frontend/session work.

## Repository map

```text
applications/backend       NestJS, SQLite lifecycle, health and diagnostics
applications/frontend      React/Vite, Tailwind, shadcn/ui, readiness screen
packages/contracts         TypeBox/Ajv schemas and semantic validation
packages/funnel-runtime    Answers, conditions, variants, routes and results
configurations             Original JSON and SHA-256 manifest
scripts                    Development, clean builds and integrity checks
documentation              Decisions, measurements and development evidence
```

[AGENTS.md](AGENTS.md) owns coding/review conventions. Tests and support files live under each workspace's `tests/` directory. [The engineering review](documentation/foundation-review.md) explains architectural decisions, complexity and performance evidence; [the development log](documentation/development-log.md) records milestones. [The audit manifest](documentation/file-audit.json) contains current file hashes and verification scope, not a permanent correctness guarantee.

## Configurations and runtime

The supplied files remain byte-identical and all use schema version 1.0:

| Version | Purpose                                                                       |
| ------- | ----------------------------------------------------------------------------- |
| v1      | Base flow and conditional office-days question                                |
| v2      | Meeting-hours question and meeting-heavy result                               |
| v3      | Compliance branch, tool count omitted from B, `recommendation_expanded` event |

Validation checks bounded JSON structure, references, condition types/order, merged content, result rules, weights and event declarations. Trigger prose is data, never executable code. Runtime operations require validated configurations.

Use `FunnelRuntime.Evaluation.evaluate(configuration, variant, answers)` when both route and result are needed; it computes them with one route traversal. Hidden, omitted and invalid answers cannot influence active routing/results. Required unanswered questions block results even when excluded from progress. Confirmation of retained answers after reopening a branch belongs to the pending session command layer.

The initial database schema separates answers from events and constrains version, operation and event identities. Those constraints alone do not implement authorization, version immutability, transactional commands or retry-safe replay. Their planned contracts and aggregation rules remain in the implementation plan.

**Experiment hypothesis:** B increases the share of started sessions opening recommendations through question order and result framing. The primary metric is unique CTA-clicking sessions / unique started sessions; result completion and CTA CTR among result viewers are secondary. Compare within one version/experiment, excluding forced assignments by default. Synthetic traffic will verify calculations, not prove the hypothesis.

## Configuration draft import

After applying migrations, import a supplied configuration into the local database:

```sh
npm run configurations:import -- "$PWD/configurations/funnel-v1.json"
```

Use an absolute file path: the command runs in the backend workspace. It prints version metadata and `created` or `existing`, without the document. All three supplied files are supported. Import validates and snapshots the configuration, hashes canonical JSON (object key order is ignored; array order is preserved), and writes an immutable draft. Repeating the same content returns the same record; changing content under the same funnel/version fails. A configuration's `status` field never activates it. The checksum here identifies canonical content; provenance checksums under `configurations/` still identify the original file bytes.

This is a trusted local operator command with database filesystem access. No unauthenticated import endpoint is exposed. Administrator authentication, publication/rollback and their HTTP interfaces remain subsequent backend iterations. Failure returns a nonzero exit code; correct the input or storage failure before retrying. A committed import is safe to repeat after a lost command result.

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

Administrator authentication, origin/header CSRF checks, sign-in throttling and publication command idempotency are implemented. User-session authorization and command idempotency, tested backup/restore and public hosting remain pending. SQLite targets one backend instance with persistent storage. Dependency override rationale is in [the engineering review](documentation/foundation-review.md#dependency-decisions); avoid unreviewed `npm audit fix --force` changes.

Local verification is not deployed/browser acceptance. The last documented remote CI attempt failed before jobs started; a current remote CI result has not been established. Follow the implementation plan's acceptance gates before claiming delivery.
