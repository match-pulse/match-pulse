# Architecture Reference

Start with the course documents, then use the reference pages when you need
detail.

## Reading path

| Document | What it is |
| :--- | :--- |
| [Kata](kata.md) | One-page domain brief; Task 1 source |
| [Requirements](requirements.md) | Broad R1–R8 and detailed R1.1–R8.x requirements |
| [Architecture characteristics](03-architecture-characteristics.md) | Selected qualities, traceability and quantified targets; Task 2 source |
| [Architecture description](reports/2026-11-10.md) | Three-minute structure, decisions, code references and limits |
| [System overview](01-system-overview.md) | Actors, boundaries and request flows |
| [Domain model](02-domain-model.md) | Entities, relationships, state changes and invariants |
| [C4 views](05-c4-diagrams.md) | Context, containers and components |
| [Code map](04-code-map.md) | Documents and rules mapped to files and tests |
| [ADRs](adr/) | The full decision records |

## The short version

MatchPulse is a **modular monolith**: one Next.js application and one PostgreSQL
database. The web UI and the CLI share `src/lib/domain/`. Critical rules are
enforced in PostgreSQL transactions, row locks, constraints, RLS and
`SECURITY DEFINER` RPCs. The database is the authorization boundary; the UI is
not.

The selected characteristics are **reliability, security, testability,
deployability and elasticity**. The targets are in
[03-architecture-characteristics.md](03-architecture-characteristics.md).

## Historical reports

- [`reports/2026-11-08.md`](reports/2026-11-08.md) — earlier snapshot, kept as a
  historical record.
- [`reports/2026-11-10.md`](reports/2026-11-10.md) — current architecture
  description.

When a report and a verification record disagree, the verification record wins.
The [findings register](../methodology/findings-register.md) tracks dispositions.
