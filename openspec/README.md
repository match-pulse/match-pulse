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

## Active changes

| Change | Goal | Status |
| :--- | :--- | :--- |
| [`add-market-fault-injections`](./changes/add-market-fault-injections/proposal.md) | Close FND-002 with observed-red fault injections for the remaining market invariants | Proposed; 0/11 tasks |

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
