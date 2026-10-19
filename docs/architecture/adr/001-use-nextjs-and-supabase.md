# ADR 001: Use Next.js, Supabase, and Vercel

- **Status:** Accepted
- **Date:** 2026-10-19
- **Last reviewed:** 2026-10-19

## Context

MatchPulse is a football tournament platform built by one developer across two courses, with a hard deliverable deadline. The domain carries rules that are costly to get wrong: participation capacity must never be exceeded, point balances must stay consistent, and market entries and exits must be settled atomically inside the trading window — including when many requests arrive at the same instant.

Three constraints follow from that context:

1. **Correctness must not depend on a single process.** The domain rules are concurrency rules. Enforcing them in application code means enforcing them across every server instance and every retry path.
2. **Delivery capacity is one person.** Infrastructure work competes directly with feature and assessment work.
3. **Technology is not the variable being assessed.** The courses assess architectural reasoning and the ability to justify a choice, not the popularity of a stack.

## Decision

We will use **Next.js 16 (App Router, Server Actions)** for the interface and server-side application logic, **Supabase (PostgreSQL)** as the system of record, and **Vercel** as the intended hosting target.

Critical business rules are enforced **inside the database**, as transactional functions, rather than in Server Actions or client code.

## Alternatives considered

| Option | Why it was not chosen |
| :--- | :--- |
| **Spring Boot + PostgreSQL** — the stack introduced in the Software Architectures lectures | Technically sound and fully capable. Rejected because adopting a Java stack purely to match lecture material is an argument from convention, not from the system's requirements. It would also add a second language and toolchain to a one-person project. The course explicitly permits other technologies and assesses justification. This remains a reasonable choice for someone already productive in it. |
| **Next.js + self-hosted PostgreSQL on a VPS** | Retains the application stack while removing vendor coupling and giving direct control over connection limits. Rejected at this stage because operating a database instance adds recurring operational work and a second failure surface, and because no measured requirement yet demands control that managed Postgres withholds. Reconsider if elasticity targets cannot be met (see `03-architecture-characteristics.md` §3.1). |
| **Event-driven architecture (broker + consumers) for predictions** | Would decouple write and reward processing. Rejected because no stated requirement needs asynchronous processing, and it introduces eventual consistency exactly where the domain demands an immediate, unambiguous answer about whether a prediction was accepted. |
| **Microservices** | Rejected. The domain is one bounded context with one database and one team of one. Splitting it would add network failure modes and deployment overhead with no corresponding benefit. |

## Consequences

### Intended benefits (not yet observed)

- **Deployability** — managed platforms remove infrastructure work from the critical path. *No deployment is configured in this repository; this benefit is intended, not measured.*
- **Atomic invariants** — transactional PostgreSQL functions make the capacity and uniqueness rules enforceable in one place. *Enforcement exists in the schema and is verified by a test suite demonstrated capable of failing (fault injection), running in CI.*
- **Reduced operational surface** — a smaller number of components is cheaper to run and to reason about.

### Observed trade-offs (accepted)

- **Vendor lock-in** — Vercel and Supabase both constrain future options. Accepted; the alternative is operational work that cannot be justified yet.
- **Coupling to a managed database's behaviour** — concurrency behaviour, connection limits and RPC semantics come from the platform. *Connection limits under burst load have not been measured.*
- **Misplaced trust in the public anonymous key** — the anon key is designed to be shipped to browsers, so it must not be mistaken for access control. The database has **no Row Level Security policies and no grants**; `anon` currently has full read and write on every table, verified by probing the local API with an arbitrary key. This is a known open risk, not an accepted trade-off. Addressed in a later increment.

### Withdrawn claims

Earlier revisions of this ADR asserted "instant CI/CD", an "Edge network" benefit for scalability, and that Row-Level Security was in place. None was supported by the repository at the time of writing. All three are withdrawn. Row Level Security is **not implemented**.

## Related

- [`03-architecture-characteristics.md`](../03-architecture-characteristics.md) — selected characteristics, targets and their status
- [`01-system-overview.md`](../01-system-overview.md) — purpose, users and data flows
- [`02-domain-model.md`](../02-domain-model.md) — entities, journeys and invariants