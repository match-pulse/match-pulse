# OpenSpec

OpenSpec is installed as a standalone CLI (`openspec 1.16.1`) and initialized in
this repository. It is used for **bounded evidence and specification changes**,
not as a second source of truth for the product.

## Why it is here

The project already has a kata, domain model, invariant registry, ADRs and
execution plans. OpenSpec adds one change folder per bounded piece of work:
`proposal.md`, optional delta specs, `design.md` and `tasks.md`. That is useful
when the change is mostly evidence or tooling and the contract between the
proposal, the technical approach and the verification tasks needs to be
reviewable in one place.

The decision and its limits are recorded in
[`../docs/methodology/development-practices.md`](../docs/methodology/development-practices.md)
§4.6.

## Changes

Active changes:

- [`add-club-tenancy-and-cli`](./changes/add-club-tenancy-and-cli/proposal.md) — v3.0.0 club tenancy, nominal ticketing and CLI foundation; implementation and release are complete, with remaining task checkboxes and archive pending.
- [`v3-1-audit-remediation`](./changes/v3-1-audit-remediation/proposal.md) — approved remediation of the v3.0.0 audit findings (FND-009–FND-028); execution plan in [`173-audit-remediation.md`](../docs/methodology/exec-plans/173-audit-remediation.md).

The first trial,
[`add-market-fault-injections`](./changes/archive/2026-11-08-add-market-fault-injections/proposal.md),
was implemented and verified in CI run
[42474762811](https://github.com/match-pulse/match-pulse/actions/runs/42474762811)
and archived on 2026-11-08. Its tasks and evidence are in the archived change and
the [fault-injection verification record](../docs/methodology/verification/2026-11-125-market-fault-injections.md).

## Commands

```bash
openspec list                         # active changes
openspec status --change <name>       # artifact completion
openspec validate <name> --type change --strict
openspec instructions apply --change <name>
openspec archive <name>               # after implementation and review
```

The generated OpenCode commands and skills live in `.opencode/`. They are
convenience wrappers around the same workflow.

## Source-of-truth boundaries

- The kata, domain model, invariant registry, ADRs, tests and verification
  records remain authoritative.
- An OpenSpec change describes one bounded change; it does not replace the
  product's current-state documentation.
- `skip_specs: true` is used when the change adds verification evidence or
  tooling without changing system behavior.
- A change is archived only after its tasks and the project's review
  requirements are complete.
