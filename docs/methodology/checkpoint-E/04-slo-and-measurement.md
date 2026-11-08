# E-04 — SLO and Measurement

## 1. Proposed objectives

See [`../../operations/slo.md`](../../operations/slo.md) for the full table.

| ID | Indicator | Target | Status |
| :--- | :--- | :--- | :--- |
| SLO-1 | Health availability | 99.5% over 30 days | Proposed; sampled only |
| SLO-2 | Health latency p95 | < 500 ms | Proposed |
| SLO-3 | Capacity burst p95 | < 1,000 ms for 100 requests | Proposed; observed value recorded |
| SLO-4 | Unhandled transport errors in the burst | 0 | Enforced by test |
| SLO-5 | CI delivery smoke | Pass on every PR and `main` | Enforced by CI |
| SLO-6 | Invariant suite duration | < 3 minutes | Measured (~2.5 min) |

## 2. p95 method

The capacity test wraps each `register_for_tournament` RPC with
`performance.now()`, computes p50/p95/max and prints one JSON line:

```json
{"event":"capacity.burst_latency","requests":100,"wallClockMs":...,"p50Ms":...,"p95Ms":...,"maxMs":...}
```

The value is **recorded, not asserted** in the first observation, because
runner and local-database variance would make a hard threshold flaky. A later
increment can add a generous assertion once the distribution is known.

## 3. What a p95 value means here

It describes 100 concurrent registrations against one local PostgreSQL
instance, in the environment named in the verification record. It is not a
production latency claim and says nothing about sustained load, multi-instance
routing or network conditions.

## 4. Target changes

A missed target is recorded with its environment and date. Targets are not
silently relaxed; changing one is a human decision.
