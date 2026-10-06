# Funnel Runtime

A TypeScript foundation for configurable web funnels with immutable versions, session-pinned experiments, event ingestion, and session-based analytics.

This repository currently provides the application foundation. The complete funnel, administrator sign-in, publication endpoints, event batching, analytics dashboard, traffic generator, and public deployment are subsequent milestones in [the implementation plan](IMPLEMENTATION_PLAN.md).

## Local development

Use Node.js 24 or 26 and npm 11. The repository pins npm 11.19.1 and uses npm workspaces. Node.js 24 is the intended deployment baseline; both versions passed local verification. Remote GitHub Actions verification has a startup failure described in the foundation review.

```sh
npm install --global npm@11.19.1
npm ci
npm run database:generate
npm run database:migrate
npm run development
```

Open the frontend at http://127.0.0.1:5173. The development server proxies `/api` to the backend at http://127.0.0.1:3000. The frontend reports actual backend readiness; it does not simulate a working funnel.

The default database location is `applications/backend/data/funnel-runtime.sqlite`. To customize backend settings, copy `applications/backend/.env.example` to `applications/backend/.env`. Relative database paths resolve from the backend application directory. Local data, environment files, dependencies, and generated outputs are ignored by Git.

Shared packages are built before development startup. Restart development after changing shared packages; application source files are watched automatically. Stop both development processes with Ctrl+C.

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

Run `npm run benchmark:runtime` to reproduce pure-function measurements across all configuration versions and variants. These measurements do not represent application throughput.

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

Authored identifiers use full names. Original JSON fields and dependency/tool conventions remain compatible at external boundaries.

## Configurations and iteration sequence

The supplied configuration files are preserved byte for byte:

- Version 1 establishes the base funnel and office-days branch.
- Version 2 adds meeting hours and a meeting-heavy result.
- Version 3 adds the compliance branch, omits tool count from variant B, and declares `recommendation_expanded`.

Configuration schemas are authored with TypeBox and validated by Ajv. Public field types derive from the schemas; explicit recursive condition edges preserve safe recursion and readonly guarantees. Required screen content is declarative, and partial variant content is validated again after merging with the base screen. The contracts typecheck also checks deliberate invalid assignments to prevent accidental widening. Runtime dispatch uses exhaustive ts-pattern matching where type alternatives benefit from it.

All use schema version 1.0. The shared validator checks structure, references, condition operand types and ordering, merged text overrides, result rules, experiment weights, and event declarations. It limits document size, nesting, node count, and reported issues. Unknown executable constructs are rejected. Human-readable trigger strings are never executed.

The pure runtime excludes hidden, omitted, and invalid answers from active route decisions and results. It resolves result rules in order and applies variant overrides. Confirmation of retained answers after reopening a branch belongs to the upcoming session command layer; pure routing cannot establish that confirmation by itself.

## Persistence and event design

The initial Prisma schema provides funnels, immutable configuration versions, publications, sessions, answers, operation receipts, events, and administrator sessions. Foreign keys protect referenced historical records; database constraints enforce unique versions, operations, and event identifiers. Composite version references prevent publications and active pointers from targeting another funnel's version.

Answers are stored separately from events. Event rows contain identifiers, source, timestamps, step, allowed properties, and a content fingerprint. Version, variant, experiment, and acquisition parameters are derived through the pinned session. Wire events include the explicit context required by the assignment.

Application-level immutability, authorization, operation replay, and atomic event/state transitions are planned invariants, not capabilities implemented by the schema alone. The detailed contracts and aggregation definitions are in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Experiment hypothesis and metrics

Hypothesis: variant B increases the share of started sessions opening recommendations through its question sequence and result framing.

The primary metric is distinct sessions clicking the main CTA divided by distinct started sessions. Secondary metrics are result completion and CTA CTR among result viewers. Comparisons are within one version and experiment. Forced assignments are excluded from experiment comparison by default. Synthetic data is marked and supports calculation verification rather than hypothesis validation.

## Security and operating boundaries

Backend startup validates environment settings, binds to loopback by default, limits JSON bodies, uses security headers, applies server timeouts, and redacts public exception responses. Readiness checks the database and expected migration state. There are no exposed administrator or mutation endpoints in this foundation.

SQLite is intended for one backend instance with persistent local storage. Backup/restore, authentication, CSRF protection, rate limits, reliable command retries, and public hosting must be implemented and verified before production readiness is claimed.

Security overrides pin patched transitive dependencies while keeping Prisma 7.10.0. Their advisory rationale and verification are recorded in [the foundation review](documentation/foundation-review.md). Do not run `npm audit fix --force` as a substitute for reviewed compatibility changes.

## Delivery status

The GitHub repository is initially private. No public application URL exists yet. Free hosting with persistent SQLite storage remains to be selected; GitHub Pages can only serve the frontend.

See [the development log](documentation/development-log.md) for actual implementation evidence and [AGENTS.md](AGENTS.md) for mandatory engineering and review rules. The assignment's 48-hour start is not yet recorded.

## Type conventions and module imports

Related operations belong to frozen domain objects, exported whole: `FunnelConfigurations.validate(document)`, `AnswerValidation.validate(step, answer)`, `RouteResolution.resolve(configuration, variant, answers)`, and `ResultResolution.resolve(configuration, variant, answers)`. `FunnelRuntime` groups these same objects for callers using several runtime domains. Standalone method aliases are not exported. All in-repository consumers use the grouped API; objects are constructed once.

Domain policy files own configuration limits and schema constraints, environment defaults, SQLite settings, transport timeouts, numeric tolerances, and readiness settings. Environment inputs use compiled TypeBox/Ajv schemas. Named rules encapsulate condition compatibility and selection constraints. Computed values remain local; message catalogs and policies remain with the subsystem that owns them.

`global-types.d.ts` provides shared types without imports: `Optional<Value>` means `Value | undefined`; `Nullable<Value>` means `Value | null | undefined`; `Maybe<Value>` is a synonym for Nullable. The base TypeScript configuration includes this file through `files`, which remains inherited when workspaces define their own `include` lists. React-specific aliases live in the frontend's `source/ui-types.d.ts`. Use the narrowest alias supported by the existing contract; these are compile-time aliases, not runtime containers or validators. Boundary validation remains TypeBox/Ajv; local predicates use ts-pattern's `isMatching` where that makes the domain check clearer. Authored validation text lives in ConfigurationMessages and AnswerMessages; configured custom answer messages still take precedence.

Backend and shared packages compile using TypeScript NodeNext and execute as Node ESM. A source import such as `./index.js` resolves to `index.ts` during typechecking and remains `./index.js` in emitted JavaScript. Explicit relative extensions are the runtime module contract, not a source-file naming convention. Public package imports such as `@kelpie/contracts` use package exports; Vite's Bundler resolution permits extensionless frontend imports. We retain the existing module strategy rather than adding a runtime loader solely to hide extensions.

An additional collection utility dependency is not currently required by the bounded runtime loops. Remeda's `pipe` API is a candidate when concrete data-transformation pipelines emerge; it would not replace configuration validation or domain branching.

These ambient types are a private monorepo convention: generated package declarations rely on the shared root declaration file being included by the consumer's TypeScript program. Before publishing packages independently, package and reference that declaration vocabulary explicitly. Ambient declarations emit no JavaScript; NominalIdentity is a type-level marker and must not be accessed at runtime.
