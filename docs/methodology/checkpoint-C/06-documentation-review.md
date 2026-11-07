# Checkpoint C — Documentation Review

- **Date:** 2026-11-07
- **Status:** Review of the current documentation set against the L12 questions: who the reader is, what is worth writing down, how records are kept findable, and how stale guidance is retired.
- **Related:** [`../../../README.md`](../../../README.md), [`../README.md`](../README.md), [`../../architecture/04-code-map.md`](../../architecture/04-code-map.md), [`../../workflows/README.md`](../../workflows/README.md)

## 1. Record types

The project separates three kinds of record. Mixing them makes it hard to tell whether a statement is a plan, a rationale or a fact.

| Record type | Question it answers | Where it lives | Examples |
| :--- | :--- | :--- | :--- |
| **Proposal** | What might we build, and under what constraints? | Issues, execution plans, Checkpoint A bounded proposal | `docs/methodology/exec-plans/`, `checkpoint-A/01-bounded-proposal.md` |
| **Decision** | Why did we choose this option over the alternatives? | ADRs, AI transparency log, review decisions, residual-risk decisions | `docs/architecture/adr/`, `checkpoint-C/03-review-decision.md` |
| **Current specification** | What does the system do now? | System overview, domain model, invariant registry, README, code map | `docs/architecture/01-system-overview.md`, `02-domain-model.md`, `checkpoint-A/02-invariants.md` |

The current specification is not a proposal. The invariant registry describes what is enforced and what evidence exists; it does not describe what the team hopes to build. The execution plans describe what was proposed and how it was delivered; they are not the current truth once superseded.

## 2. Readers and views

| Reader | What they need | Where to start |
| :--- | :--- | :--- |
| **Technical reader** | Interfaces, structure, constraints, code locations | `docs/architecture/01-system-overview.md`, `02-domain-model.md`, `04-code-map.md`, C4 diagrams |
| **User / operator** | Run the project, complete a task, recover from failure | Root `README.md`, Docker/Supabase quickstart, seeded demo URLs |
| **Project reader** | Scope, assumptions, claims, decisions, evidence, residual risk | `docs/methodology/checkpoint-A/`, `checkpoint-B/`, `checkpoint-C/`, AI log |
| **Process reader** | Repeat development, review, testing, operations | `docs/workflows/`, templates, Checkpoint C test-case process |
| **Assessor** | The course rubric mapped to evidence | Root README “Development Methodology” links; final portfolio index (planned) |

One document does not have to serve every reader, but the project should know which reader it is writing for. The architecture docs are technical; the checkpoint records are project evidence; the workflow docs are process contracts.

## 3. What is worth writing down

The project writes a record when at least one of these is true:

- a wrong reading would change a decision;
- the context is hard to reconstruct later;
- a guide prevents repeated guesswork.

Examples:

- The **invariant registry** is worth writing because a wrong status would let a claim pass without evidence.
- The **lock-order decision** is worth writing because a future contributor could reverse it and introduce a deadlock.
- The **AI transparency log** is worth writing because the course requires declared, verified AI use and because rejected suggestions are part of the reasoning.
- The **flow evidence** is worth writing because it is a measurement, not a feeling.
- The **seed/demo instructions** are worth writing because another person must be able to run the project.

The project does not try to record every meeting or every thought. The rule is usefulness, not volume.

## 4. Findability

Current entry points:

1. Root [`README.md`](../../../README.md) — product status, quickstart, architecture links, methodology links, known gaps.
2. [`docs/methodology/README.md`](../README.md) — record index and rules.
3. [`docs/architecture/04-code-map.md`](../../architecture/04-code-map.md) — maps architecture elements to files, migrations and tests.
4. [`docs/workflows/README.md`](../../workflows/README.md) — process contracts and templates.
5. Checkpoint A/B/C records — the project evidence narrative.

**Gap:** there is no single course-facing portfolio index that maps the rubric criteria to evidence. The root README links to the records, but the assessor still has to reconstruct the story. A portfolio index is the next documentation deliverable, not part of this checkpoint.

## 5. Stale guidance and retirement

The project has already retired several stale claims. Each is recorded rather than silently removed:

| Stale guidance | What changed | Where the correction is recorded |
| :--- | :--- | :--- |
| Fixed-score predictions with a pre-kickoff deadline | Replaced by a live market that opens at kickoff | ADR-002; `20261023_retire_predictions.sql`; invariant registry; README |
| `release.env` as a runtime configuration source | Removed; Next.js inlines `NEXT_PUBLIC_*` at build time | AI log Entry 8 and Entry 15; Dockerfile; README |
| “AI-Driven Development Lifecycle” label | Corrected to human-controlled AI-assisted delivery | Operating model §1 correction |
| Checkpoint B reusing the Checkpoint A burst test as operating-model evidence | Withdrawn; replaced by flow evidence from repository history | Checkpoint B README §2; `03-flow-evidence.md` |
| Architecture characteristics claiming deployment or RLS that did not exist | Withdrawn and marked unverified/not implemented | `03-architecture-characteristics.md`; ADR-001 |
| README claiming “instant CI/CD” or “RLS in place” | Withdrawn | ADR-001 “Withdrawn claims”; README known gaps |

The rule: a superseded record keeps its original content and gains a dated link to the replacement. The project does not rewrite history to look consistent after the fact.

## 6. Documentation reacts to change

A change should trigger a documentation review:

1. Identify which documented claim is affected.
2. Update or remove guidance that is stale.
3. Recheck linked examples and interfaces.
4. Record the change in the changelog and AI log when applicable.

Examples of changes that require a documentation review:

- a new invariant or a changed enforcement mechanism → invariant registry, domain model, code map, tests;
- a schema migration → domain model, code map, README quickstart if setup changes;
- an authorization change → system overview, architecture characteristics, risk map, residual risk;
- a deployment or operational change → README, Checkpoint E, runbook;
- a new AI tool or practice → development practices, AI log, AGENTS/workflow if the harness changes.

## 7. Essential and accidental complexity

The L12 optional chapter distinguishes:

- **Essential complexity** — the difficulty required to represent the problem: capacity, points, positions, resolution, privacy rules.
- **Accidental complexity** — extra difficulty added by the representation: duplicated rules, unnecessary dependencies, manual steps that could be automated.

MatchPulse's architecture tries to contain essential complexity in one place:

- the database is the single enforcement point for transactional invariants;
- the application layer validates input and translates results but does not duplicate the domain decision;
- the tests assert committed state at the database boundary;
- the code map links the rule to the migration, function and test.

The duplicated enforcement risk is real: if the same rule is implemented in the UI, the Server Action and the database, a change can make them disagree. The project's rule is that the database is authoritative; the UI and action are translations, not second sources of truth.

Architecture cannot remove the domain rules. It can give one part clear responsibility for a rule and make a change cheaper. It also adds costs: an interface, a migration, a test, a review. The useful question is not “is this simple?” but “does it reduce a costly difficulty here, and are the new obligations worthwhile?”

## 8. Gaps and next actions

| Gap | Impact | Next action |
| :--- | :--- | :--- |
| No single rubric-aligned portfolio index | The assessor must reconstruct the story from many files | Create `docs/portfolio/README.md` with rubric criteria and evidence links |
| Findings register was empty despite known gaps | Traceability gap; known risks were not tracked centrally | Populate the register with the current findings (this change) |
| No operational runbook or incident evidence | Checkpoint E will be thin | Build the delivery/operations slice |
| No reader test of the quickstart | “Another person can run it” is documented but not independently verified | Ask a peer to follow the README and record the friction |
| Documentation volume | Process-theatre risk; a reader may not know what to read first | Keep the README and portfolio index as the entry points; link, do not duplicate |

## 9. Decision

Keep the current document set as the current specification and evidence record. Do not add another documentation system. The next documentation improvement is a single portfolio index that maps the course rubric to the existing records; the next engineering improvement is the authorization increment, recorded as a residual risk rather than hidden in prose.
