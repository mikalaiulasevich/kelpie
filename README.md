# Funnel Runtime

A TypeScript/NestJS/React foundation for configurable funnels. Implemented: configuration validation, pure funnel evaluation, the initial Prisma/SQLite schema, backend lifecycle and health endpoints, and a frontend readiness screen.

**The product is not complete.** Session commands, administrator access, publication/rollback, event ingestion, analytics, synthetic traffic and public deployment remain in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). No public application URL or agreed 48-hour start is recorded.

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

The default database is `applications/backend/data/funnel-runtime.sqlite`. For custom settings, copy `applications/backend/.env.example` to `applications/backend/.env`; relative database paths resolve from the backend directory. Secrets, local data and generated outputs are ignored by Git.

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

## Diagnostics and troubleshooting

The backend emits structured JSON to stderr. Requests reaching middleware receive a server-generated `x-request-id`; completion records include the registered route template, method, status and duration. Aborted connections are distinguished. Node-level HTTP parser failures occur before this correlation.

Logs omit bodies, raw URLs, cookies, credentials, arbitrary error messages and absolute paths. Error codes/messages are allowlisted; bounded stack locations are hashed. Fingerprints identify callsites within the matching build, not a readable stack trace.

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

Authentication, CSRF, rate limits, command idempotency, tested backup/restore and public hosting remain pending. SQLite targets one backend instance with persistent storage. Dependency override rationale is in [the engineering review](documentation/foundation-review.md#dependency-decisions); avoid unreviewed `npm audit fix --force` changes.

Local verification is not deployed/browser acceptance. The last documented remote CI attempt failed before jobs started; a current remote CI result has not been established. Follow the implementation plan's acceptance gates before claiming delivery.
