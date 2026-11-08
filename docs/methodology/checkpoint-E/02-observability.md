# E-02 — Observability

## 1. Signals

| Signal | Implementation | What it proves | What it does not prove |
| :--- | :--- | :--- | :--- |
| Health | `GET /api/health` returns `200`/`503`, app and db status | The process answers and can perform a public database read | Domain correctness, queue depth, write availability |
| Logs | JSON lines from `src/lib/logger.ts` | A named event occurred with structured fields | Complete tracing or correlation across services |
| Smoke | `bun run smoke` checks health, login and home redirect | The app starts, serves HTML and reaches the database | Authenticated trading or every route |
| CI delivery job | Builds, starts and smokes the app | The delivery path works from a clean checkout | Production environment behavior |

## 2. Log events

| Event | Level | Fields |
| :--- | :--- | :--- |
| `health.db_check_failed` | error | `message` |
| `market.enter_failed` | error | `requestId`, `marketId`, `message` |
| `market.exit_failed` | error | `requestId`, `marketId`, `message` |
| `registration.failed` | error | `tournamentId`, `message` |

No tokens, keys, emails, full form bodies or session data are logged.

## 3. Health contract

- Public, read-only, `cache-control: no-store`.
- Uses the cookie-based server client and a public `markets` read; no service
  role, counts, identities or environment values.
- `503` when the read fails; the app remains up so a monitor can distinguish
  "process down" from "database unreachable".

## 4. Gaps

- No metrics endpoint, tracing, dashboard, alert or log retention.
- Availability is observed only when CI or a person runs a probe.
- No correlation ID is propagated across all actions; request IDs exist only
  where the trade contract supplies one.
