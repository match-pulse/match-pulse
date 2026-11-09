# Testing with Agents

This directory defines how an AI agent tests MatchPulse without a browser. The CLI is a second client of the same application contract as the web UI, so an agent can exercise the full system, capture JSON evidence and assert database state.

## Layers

| Layer | Purpose | Tool |
| :--- | :--- | :--- |
| Domain invariants | Capacity, points, market lifecycle, idempotency, resolution | `bun run test` |
| Tenancy and authorization | Club isolation, role matrix, entitlements, privacy | `bun run test` |
| CLI contract | Command shape, JSON, exit codes, help | `bun run test:agent` |
| Agent playbook | End-to-end role journeys and negative cases | `bun run test:agent` |
| Web E2E and accessibility | Rendering, navigation, axe | `bun run test:e2e` |
| Delivery and recovery | Health, smoke, backup/restore | CI `Delivery and recovery` job |
| Fault injection | Observed-red mutation evidence | `bun run fault:inject` |

## Safety rules

- Run against local Supabase or CI only.
- Actors act through user sessions. The service role is used only for fixtures and database verification.
- Never put the service role in a user CLI profile.
- Destructive commands require `--yes`; they are never part of a happy-path scenario.
- Do not claim a scenario passed without its JSON output, exit codes and assertions.
- No real payments, KYC, personal data sale or real-money prediction market is tested because none exists.

## Commands

```bash
bun run test:agent                              # executable playbook
matchpulse commands --json                      # discover commands
matchpulse describe <command> --json            # command schema
```

The human/agent-readable guide is [agent-playbook.md](./agent-playbook.md). The capability inventory is [capabilities.md](./capabilities.md).
