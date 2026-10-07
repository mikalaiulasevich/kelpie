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

## Verification history

The initial foundation was installed and checked locally on Node.js 24 and 26. A frontend readiness check was inspected in desktop/mobile layouts at that milestone. Subsequent refactors were checked on Node.js 24.16.0; they do not constitute new browser or Node.js 26 verification.

The subsequent plan-conformance pass corrected optional-answer progress, scoped operation identifiers to their session, isolated diagnostics from supplied error stacks and aligned development shutdown budgets. That pass was followed by the Fastify migration; the current verification covers 257 tests and the full verification command. The previous toolkit review’s three 79-case benchmark runs and the current verification summary are recorded in [the engineering review](foundation-review.md). Raw reports and CSV history remain in [benchmarks](benchmarks/).

A historical GitHub Actions attempt failed before jobs started; this cleanup does not establish current remote CI status. No public deployment has been verified.

## Remaining delivery milestones

| Iteration            | Status                                                                                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First working funnel | Foundation only. Session persistence commands, administration, publication, event ingestion, analytics and traffic generation remain to implement.               |
| Second iteration     | Pending the first working funnel. Publish v3, verify both variants and retained older sessions, then roll back to v2 while preserving v3 sessions and analytics. |
| Bun and deployment   | Bun backend migration, Node.js/npm fallback verification, hosting with persistent storage and public acceptance remain pending.                                  |

[IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) owns the detailed acceptance sequence. Update this timeline for completed product milestones; keep command output and repeated polish reports out of it.
