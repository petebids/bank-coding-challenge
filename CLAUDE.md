# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A take-home challenge implementation (see `spec.txt`): a web app where staff enter
loan details (`loanAmount`, `loanTermInMonths`, `riskBand`) and get back a commission
quote from an external vendor. The vendor is mocked (it requires an `api-key` header
and randomly fails ~15% of the time), and a Temporal workflow sits between the
frontend and the vendor to make quote generation durable and idempotent — see the
"Why Temporal?" section of `README.md` for the reasoning.

This is an npm-workspaces monorepo with four packages:

- `commision-quote-app/` — Next.js (App Router) frontend + backend
- `temporal-worker/` — the Temporal worker (workflow + activity)
- `mock-vendor-comission-quote-api/` — the mock vendor API (Express)
- `shared/` — request/response contracts (zod) and Temporal names, imported by all
  three of the above so they can't drift apart

Note the (intentional, spec-inherited) typo in the two long directory names:
`commision-quote-app` and `mock-vendor-comission-quote-api`.

## Commands

Run from the repo root unless noted. `npm install` at the root installs every
workspace.

```bash
# Infra: Temporal server/UI, mock vendor API, Temporal worker
docker compose up -d --build
docker compose down
docker compose logs -f temporal-worker   # or mock-vendor-api

# Frontend (host, not containerized — "demo mode")
npm run dev                 # commision-quote-app on :3000, needs docker compose up first

# Unit/integration tests, all workspaces
npm test
# One workspace only, e.g.:
npm test --workspace temporal-worker
# One test file:
npx vitest run src/workflows.test.ts        # from within a package dir

# Playwright e2e (needs docker compose up first; starts `next dev` itself)
npm run test:e2e
# One spec / one test:
npx playwright test -g "golden path"        # from commision-quote-app/

# Typecheck a package
npm run typecheck --workspace temporal-worker   # or mock-vendor-comission-quote-api
npx tsc --noEmit                                # from commision-quote-app/ (no script wired)

# Lint (commision-quote-app only)
npm run lint --workspace commision-quote-app
```

`.nvmrc` pins Node 22 — the `@temporalio/*` packages and Playwright require Node
>=20; the repo won't install/run correctly on Node 18.

## Architecture

```
Browser (MUI form, react-hook-form, react-query)
  │  POST /api/quotes { loanAmount, loanTermInMonths, riskBand, idempotencyKey }
  ▼
Next.js API routes (app/api/quotes/**)         — thin controllers
  │  calls
  ▼
Service layer (lib/services/quoteService.ts)   — the ONLY thing that talks to Temporal
  │  @temporalio/client: workflow.start / .query / .signal
  ▼
Temporal Server (docker-compose: postgres + temporal + temporal-ui)
  │  dispatches on task queue "commission-quote"
  ▼
Temporal Worker (temporal-worker/, separate Node process)
  │  workflow: generateCommissionQuoteWorkflow
  │    query:  getStatus  → current QuoteState
  │    signal: retry      → re-run the vendor call, optionally overriding the
  │                         simulated outcome
  │  activity: callVendorApi  ── HTTP + api-key header ──▶  Mock Vendor API
```

The browser and the Next.js app never see the vendor's `api-key` — only the worker's
`callVendorApi` activity (`temporal-worker/src/activities.ts`) holds it, read from the
`VENDOR_API_KEY` env var.

### The two-generals handling, concretely

- **Browser → Next.js**: `QuoteForm` generates a fresh `crypto.randomUUID()`
  idempotency key per submit *attempt* (`components/QuoteForm.tsx`). `useCreateQuote`
  (`hooks/useCreateQuote.ts`) sets `retry: 2` on the mutation, so if the POST itself
  drops, react-query resubmits with the *same* variables (same key).
- **Next.js → Temporal**: `quoteService.createQuote` starts a workflow with
  `workflowId = quote-${idempotencyKey}` (`shared/src/temporal.ts:quoteWorkflowId`). A
  second `start` call with the same ID throws `WorkflowExecutionAlreadyStartedError`,
  which the service layer swallows and treats as success — this is what actually
  prevents a duplicate vendor call.
- **Worker → Vendor**: the `callVendorApi` activity itself has a Temporal-managed
  retry policy (`temporal-worker/src/workflows.ts`, `proxyActivities` options) for
  ordinary transient failures, independent of the above.

### Signal/query contract lives in `shared`, not in the worker

`shared/src/temporal.ts` defines `statusQuery` and `retrySignal` via
`@temporalio/workflow`'s `defineQuery`/`defineSignal`. Both the workflow
implementation (`temporal-worker/src/workflows.ts`) and the Next.js service layer
import these same definitions, so the Next app depends only on `shared` +
`@temporalio/client` — never on `temporal-worker` itself (which pulls in the worker
runtime and a native module).

The `retry` signal carries an optional `{ forcedOutcome }` payload
(`RetrySignalPayload`), which is how a demo can flip a `FAILED` run to succeed: the
"Simulate vendor response" selector in the UI is passed through on retry
(`components/QuoteResult.tsx` → `hooks/useRetryQuote.ts` → the retry API route →
`quoteService.retryQuote`).

### Package-specific notes

- **`shared`**: `package.json` `main`/`types` point straight at `src/index.ts` — there
  is no build step. Every consumer (Next.js via `transpilePackages`, the worker via
  Temporal's webpack-based workflow bundler, tsx for everything else) reads the TS
  source directly. Internal imports inside `shared` are **extensionless**
  (`./contracts`, not `./contracts.js`) — Turbopack does not resolve the
  `.js`-pointing-at-`.ts` convention that Node's own ESM loader would otherwise
  require, so all four tsconfigs use `moduleResolution: "bundler"` to stay consistent
  with what actually loads shared's source at runtime.
- **`temporal-worker`** and **`mock-vendor-comission-quote-api`**: no `tsc` build
  step either — `npm start` runs `tsx src/*.ts` directly, including in their
  Dockerfiles. `npm run typecheck` (`tsc --noEmit`) exists as a separate check.
- **`temporal-worker`**'s Dockerfile uses `node:20-bookworm-slim`, not `-alpine`:
  `@temporalio/core-bridge`'s native binary needs glibc and crashes under Alpine's
  musl libc (`mock-vendor-comission-quote-api`, which has no native deps, stays on
  Alpine).
- Local dev of the worker outside Docker (`npm run dev:worker` at the root) needs
  `TEMPORAL_ADDRESS=localhost:7233`, `VENDOR_API_URL=http://localhost:4000`, and
  `VENDOR_API_KEY` set to match the mock vendor's (see `.env.example`).

### Frontend state shape

`app/page.tsx` owns `quoteId` and the "Simulate vendor response" selection, and passes
both down; `QuoteResult` is remounted (`key={quoteId}`) on every new submission so its
react-query state doesn't bleed across quotes. `useQuoteStatus` polls
`GET /api/quotes/:id` every second while `status === "PENDING"` and stops once the
workflow reaches a terminal state (`COMPLETED` / `FAILED` / `EXPIRED`).
