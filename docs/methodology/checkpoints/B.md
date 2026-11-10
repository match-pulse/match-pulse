# Checkpoint B — Operating Model and Feedback

**3-minute checkpoint.** Why does this lifecycle fit the main uncertainty, how
does one item move from idea to use, and which feedback changes a decision?

## Main uncertainty

The main uncertainty is **solution and integration uncertainty**, not whether the
product category exists. The domain rules — capacity, points, resolution, club
isolation — must be stable; the implementation and the evidence are discovered in
slices. A fully plan-driven lifecycle would commit too early to an unvalidated
product. A fully adaptive lifecycle would put the concurrency invariants at risk.

## Lifecycle

I use a **hybrid lifecycle**:

| Layer | Choice | What it covers |
| :--- | :--- | :--- |
| Domain contract | Plan-driven | Kata, requirements, domain model, invariants, schema constraints, ADRs, RPC contracts |
| Delivery | Iterative and incremental | Issue → branch → implementation → tests → PR → CI → review → merge |
| Scope and priority | Adaptive | Backlog order, non-goals, pivots, residual-risk decisions |

## Flow of one item

A unit of work is a **slice**, not a whole feature: intake (issue with scope and
Done-when), plan, build (one branch), verify (invariants, fault injection, static
checks, smoke), review (diff, tests, docs, security), integrate (CI plus human
authorization), and learn (link evidence, update the board).

**Where work waits.** The main queues are CI/review, human authorization, the
local Docker/Supabase environment and product decisions. In the measured cycles,
PR feedback was 2m54s–3m32s, merge-to-green was 2m15s–2m39s, and WIP never
exceeded one implementation PR. One 21-minute platform lag on #69 was not
explained by job duration. These are one developer's cycles, not a benchmark.

## Feedback that changed a decision

The important correction was early: the operating model claimed CI protected
domain correctness, but CI ran only lint and build. The invariant job was added in
#60. The documentation had asserted a control that did not exist; the record was
corrected rather than hidden.

Fault injection demotes a test that cannot fail; review changes a lock order or
adds missing evidence; flow evidence changes WIP policy; the AI log changes the
AI boundary. Organizer/fan feedback and production monitoring are **missing**:
there is no user study and no deployment.

## Observed, proposed, unknown

- **Observed:** capacity holds under a 100-request burst; double-spend is
  prevented across two markets; resolution is one-shot; WIP is one slice.
- **Proposed:** the hybrid lifecycle explains the practice; it is not a controlled
  experiment.
- **Unknown:** whether organizers value the control; multi-instance behaviour;
  sustained load; the market signal's value.

If adoption uncertainty dominates, run organizer interviews before more
engineering. If solution uncertainty dominates, add a spike. If the system becomes
production-critical, add plan-driven security, release and recovery gates. If flow
shows a persistent queue, change WIP, review ownership or slice size and measure
again.

**Detail:** [SDLC decision](../checkpoint-B/04-sdlc-decision.md) ·
[flow evidence](../checkpoint-B/03-flow-evidence.md)
