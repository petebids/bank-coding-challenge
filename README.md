# Commission Quote App

A staff-facing tool for generating loan commission quotes from an external vendor.
Built for the take-home coding challenge described in `spec.txt`.

## AI usage

### The work I did before engaging AI

- Analysed the requirements to understand what the reviewer was hoping to see.
- Made all the technical choices - NextJS, Tanstack Query, React Form, fullstack Typescript, docker for local dev
- the testing strategy


### What I delegated to claude 

- Turning the take-home spec plus my architecture choices (Temporal, a service layer
  over Temporal's query/signal API, MUI/react-hook-form/react-query, Docker Compose,
  Playwright) into a concrete file layout and implementation plan.
- Generating the initial implementation across all four packages: the Next.js
  frontend and API routes, the service layer, the Temporal workflow/activity, and the
  mock vendor API.
- Writing the unit tests, the Temporal workflow test (using `@temporalio/testing`),
  and the Playwright e2e suite.
- Debugging environment/tooling issues surfaced while actually running the stack
  end-to-end (a webpack/`ajv` version conflict from an `npm --legacy-peer-deps`
  install, a musl-vs-glibc native-module crash in the worker's Alpine Docker image,
  and a Turbopack module-resolution quirk with the shared package's `.js`-extension
  imports).

### What I reviewed manually

- ran e2e tests, npm installs, manual testing 
- reviewed package structure for adherence to idioms.
- test implementation details



## Why Temporal?

The spec calls out that the vendor API "must occasionally (randomly) throw an error,"
which I interpreted as an ask to demonstrate my understanding of distributed systems general problem of talking to any
downstream service: if a request to the vendor times out, the caller can't tell
whether the vendor actually processed it or not (the "two generals" problem), so a
naive retry risks a duplicate. Rather than papering over that with a client-side
spinner and a "try again" button, this app uses [Temporal](https://temporal.io) to run
quote generation as a durable, idempotent workflow:

- The workflow ID is derived from a client-generated idempotency key. If the browser
  is unsure whether an earlier submission reached the server, it resubmits with the
  *same* key, and the service layer treats a "workflow already started" response as
  success instead of placing a second call to the vendor.
- The vendor call is a Temporal Activity with an automatic retry policy, so a single
  transient vendor failure resolves itself without any user action.
- If automatic retries are exhausted, the workflow parks in a `FAILED` state and waits
  on a `retry` **signal**; the frontend polls status via a `getStatus` **query** and
  offers a "Retry" button that signals the same workflow to try again — no duplicate
  vendor call, no lost progress.

See the architecture section of `CLAUDE.md` for the full request path and file layout.

## Tradeoffs
In this architecture, which I think is fine for the demo, the app doesn't have it's own storage and relays calls from the UI. to the server, to Temporal. 
This pattern can be extended to updating a local projection of the entities and their state to have an easily securable list of previous quotes, a dashboard etc. 
This pattern trades simplicity for availability - we can't start a durable workflow if the vendor quote API is down. An alternative tradeoff is to use the transactional outbox pattern and primary storage to store the user's intent, and a consuemr of the transactional outbox events can invoke temporal. 
This would add operational overhead and could be the right tradeoff given the circumstances

## Wny end to end testing

All testing introduces coupling to some level of implementation detail.
The level of coupling represents a trade-off - the more coupled to internals, the more precise the tests can be, and the faster they can be instantiated. 
The downside of this approach is that by coupling to internals, to refactor said internals, you must refactor the tests, which breaks the red/green/refactor loop. 
I subscribe to the ideology expressed [here](https://dev.to/craftedwithintent/understanding-the-testing-pyramid-and-testing-trophy-tools-strategies-and-challenges-k1j) - that unit tests should lean more towards units of behaviour or black box testing e.g. verifying the application does what it should from the o
For mature systems running in production, e2e test coverage can be a bottleneck in CI or a release process, and be replaced by synthetic tests in production


## What I would change for production

The application would need it's own storage and application authentication and authorisation. Depending on what we knew about the longer term scope, I could have swapped the tech stack for a vite SPA and a Spring Boot Kotlin backend for a better technical ecosystem for the problem space

## Prerequisites

- Node.js 22 (see `.nvmrc`; `nvm use` if you have nvm installed)
- Docker Desktop (or another Docker Engine + Compose v2)

## Running it

1. **Start the backend infrastructure** (Temporal server + UI, the mock vendor API,
   and the Temporal worker) via Docker Compose:

   ```bash
   docker compose up -d --build
   ```

   This exposes:
   - Temporal frontend at `localhost:7233` (used by the Next.js app below)
   - Temporal Web UI at [http://localhost:8080](http://localhost:8080)
   - The mock vendor API at `localhost:4000`

2. **Install dependencies** (npm workspaces — one install covers every package):

   ```bash
   npm install
   ```

3. **Run the web app** in demo mode:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Fill in the loan details and
   click "Generate Quote." The "Simulate vendor response" field lets you force a
   success or a failure on demand — handy for seeing the retry flow without waiting on
   the vendor's real ~15% random failure rate.

4. **Shut everything down** when you're done:

   ```bash
   docker compose down
   ```

## Running the tests

Unit and integration tests (per workspace, via [Vitest](https://vitest.dev)):

```bash
npm test
```

This covers: mock vendor API auth/validation/failure-simulation behavior, the
Next.js service layer's idempotency handling (with a mocked Temporal client), the
`QuoteForm`'s client-side validation, and the Temporal workflow's retry/signal logic
(run against a real, ephemeral, time-skipping Temporal test server via
`@temporalio/testing` — no mocking of Temporal itself).

End-to-end tests (Playwright, driving a real browser against the full stack):

```bash
docker compose up -d --build   # if not already running
npm run test:e2e
```

This starts `next dev` automatically and exercises: the golden path, client-side
validation of invalid input, and the forced-failure-then-retry-to-success recovery
flow, all through the real UI.

## Project layout

- `commision-quote-app/` — Next.js frontend + backend (API routes, service layer)
- `temporal-worker/` — Temporal worker (workflow + activity implementations)
- `mock-vendor-comission-quote-api/` — the mock vendor Commission Quote API
- `shared/` — request/response contracts and Temporal task queue/signal/query names,
  shared by all three so they can't drift apart
- `docker-compose.yml` — Temporal server/UI, the mock vendor API, and the worker

See `CLAUDE.md` for a deeper architectural walkthrough.

