# Development Practices

This page records the practices the project actually uses: how it tests, how it
specifies a change, how it reviews, and where OpenSpec fits. It is descriptive,
not a claim that every slice followed the ideal.

## 1. Testing: invariant-first, risk-first

The project is not strict TDD. The critical rules are transactional and
concurrency rules; a red-green-refactor loop on a pure function would not exercise
the risk. The approach is:

1. State the rule independently of the implementation (kata, domain model,
   invariant registry).
2. Write a database-backed test against the real schema.
3. Assert committed state, not only the response.
4. Deliberately break the guard and confirm the test fails.
5. Record the environment and the limit.

This is **invariant-first** and **risk-first**. The strongest tests go to the
rules that can fail silently: capacity, balances, positions, resolution,
authorization, ticket allocation, reward replay and cohort suppression.

TDD still fits pure local rules, such as CSV formula neutralisation or an error
mapping. It is a tool for the right scope, not a badge.

## 2. Test levels and oracles

| Level | Use |
| :--- | :--- |
| Unit | Pure transformations and small rules |
| Domain invariant | A database function under a real transaction and committed state |
| Integration | A full v3 journey across tables, RLS and RPCs |
| CLI agent | The same contract through the second client |
| E2E | The browser journey and accessibility |
| Fault injection | Proof that a test can detect a removed guard |

The oracle is the kata, the domain model and the invariant registry — not the
implementation. When the test and the code share an assumption, the test can
pass while the rule is wrong. The observed-red injection is the check against
that failure mode.

## 3. Specification: spec-first per slice, spec-anchored for the domain

The project uses **spec-driven development** in a bounded way:

- **Spec-first per slice.** Each issue states the intent, the scope, the
  acceptance criteria and the evidence. The implementation follows that intent.
- **Spec-anchored for the domain.** The kata, domain model, invariant registry
  and ADRs are maintained as the current specification. A behaviour change must
  update them.
- **Not spec-as-source.** The code is not generated from a maintained formal
  specification. The project does not have the tooling or the need for that.

The specification is not a contract frozen forever. It changes when evidence
changes, and the change is recorded.

## 4. OpenSpec: a bounded trial, not a second source of truth

OpenSpec is a tool that supports the explore → propose → apply → verify → archive
flow. It was adopted for one bounded evidence change and then used for the v3
change.

**What it is good for:** making the intent and the scope of a change explicit,
keeping a proposal/design/tasks trail, and giving an AI-assisted change a
reviewable structure.

**What it is not:** a replacement for the lifecycle, the kata, the invariant
registry, the ADRs or the tests. The repository documents remain authoritative.
OpenSpec is a change-planning layer.

**Decision:** use OpenSpec for changes that need a written proposal and a
multi-step plan; do not use it for every small fix. A change with no behaviour
delta can set `skip_specs: true`; do not invent a behavioural requirement for
test-only or documentation work.

The adoption decision and limits are in
[`../../openspec/README.md`](../../openspec/README.md).

## 5. Review and AI

Review is a role, not a rubber stamp. The reviewer checks:

- correctness against the kata and the invariant registry;
- scope: no unrelated changes, no silent expansion;
- security: RLS, grants, RPC checks, service-role use;
- data: migration compatibility, backfill, rollback;
- tests: do they assert committed state, and can they fail?
- documentation: does it describe the current behaviour and the limit?

AI can draft, implement, test and review within an approved scope. It cannot
approve its own work or accept risk. The [AI use summary](ai-use.md) and the
[full log](ai-transparency-log.md) record what AI got wrong and how it was
corrected.

## 6. Course mapping

| Course idea | How the project uses it |
| :--- | :--- |
| Claim, evidence, limit, decision | Every checkpoint and the methodology report |
| Risk control matrix | Checkpoint C; risk-based test selection |
| Test oracle and scope | The kata/domain rule, not the implementation |
| QA vs QC | QA is the invariant/risk process; QC is the test execution and review |
| Verification vs validation | Verification is the database/test evidence; validation is the (missing) user study |
| SDD | Spec-first per slice, spec-anchored for the domain |
| AI-DLC | AI-assisted/driven work with human gates and evidence |

## 7. Limits

- There is no independent human reviewer or test author.
- The flow evidence covers one developer and a short period.
- OpenSpec was trialled on a small number of changes; it is not proven at scale.
- The project does not have a production environment, so operational practices
  are exercised in CI, not in production.
