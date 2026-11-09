# Agent Playbook

- **Status:** Specification. Commands are being implemented in `v3.0.0`; this document becomes verified when the scenarios in `tests/agent/` pass in CI.
- **Related:** [Capability manifest](./capabilities.md), [Test strategy](../methodology/test-strategy.md), [CLI contract](../architecture/adr/009-email-password-and-simulated-commerce.md).

## 1. Purpose

Describe how an agent proves every MatchPulse capability end to end:

1. authenticate as a real actor;
2. perform the capability through the CLI;
3. assert the JSON response and exit code;
4. assert committed database state;
5. prove the refusal cases do not change state.

The browser suite remains responsible for rendering, navigation and accessibility. The CLI suite proves application and authorization behavior.

## 2. Setup

```bash
bunx supabase start
bunx supabase db reset
eval "$(bunx supabase status -o env)"
# write .env.local from the local Supabase values
bun run auth:admin
bun run test:agent
```

Actors are separate CLI profiles. Attendee fixtures live in `tests/agent/fixtures/` and contain only synthetic names, dates and document numbers.

```bash
matchpulse auth signup --profile fan-a --email fan-a@example.test --password ...
matchpulse auth signup --profile fan-b --email fan-b@example.test --password ...
matchpulse auth login  --profile club-a-owner --email owner-a@example.test --password ...
matchpulse auth login  --profile club-b-owner --email owner-b@example.test --password ...
matchpulse auth login  --profile admin --email admin@example.test --password ...
```

Email confirmation is disabled locally. The agent must not assume a confirmation email exists.

## 3. Scenario: Match-day play

**Actors:** `club-a-owner`, `fan-a`, `fan-b`, `club-b-owner`, `admin`.

| Step | Actor | Command | Expected |
| ---: | :--- | :--- | :--- |
| 1 | club-a-owner | `club create --name "Club A" --json` | exit 0, club id |
| 2 | club-a-owner | `club plan request --plan PRO --json` | pending request |
| 3 | admin | `admin plans assign --club <id> --plan PRO --json` | active plan |
| 4 | club-a-owner | `club events create --name "Derby" --capacity 100 --json` | event id |
| 5 | club-a-owner | `club ticket-types create --event <id> --name "General" --price 1500 --allocation 100 --json` | ticket type id |
| 6 | club-a-owner | `club events publish --event <id> --json` | published |
| 7 | fan-a | `fan events list --json` | contains event |
| 8 | fan-a | `fan tickets buy --ticket-type <id> --attendees attendees-a.json --terms --request-id <uuid> --json` | order, 2 nominative tickets |
| 9 | fan-b | `fan tickets buy --ticket-type <id> --attendees attendees-b.json --terms --request-id <uuid> --json` | order, 1 nominative ticket |
| 10 | club-a-owner | `club predictions enable --event <id> --json` | enabled |
| 11 | fan-a | `fan predictions enter --market <id> --outcome HOME --budget 100 --request-id <uuid> --json` | position |
| 12 | fan-b | `fan predictions enter --market <id> --outcome AWAY --budget 50 --request-id <uuid> --json` | position |
| 13 | club-a-owner | `club tickets check-in --code <ticket-code> --json` | checked in |
| 14 | club-a-owner | `club analytics summary --json` | sales and attendance |
| 15 | club-a-owner | `club analytics predictions --event <id> --json` | aggregate outcomes, no identities |
| 16 | fan-a | `fan portfolio show --json` | position visible |
| 17 | fan-a | `fan rewards list --club <id> --json` | club rewards |
| 18 | fan-a | `fan rewards redeem --reward <id> --request-id <uuid> --json` | discount code |
| 19 | club-b-owner | `club analytics summary --json` | only Club B data |
| 20 | admin | `admin audit list --json` | plan, export and admin events |

### Assertions

- The ticket count never exceeds the event capacity or ticket-type allocation.
- Every ticket is nominative and has its own attendee identity and code.
- The buyer can buy for attendees who do not have a MatchPulse account.
- The fan sees the same account and points balance across Club A and Club B.
- Club A's analytics contain only Club A events; Club B cannot read Club A's event, orders or insights.
- Prediction insights contain aggregate outcomes only and suppress cohorts below 5.
- The check-in is idempotent: a second check-in does not duplicate attendance.
- The reward redemption creates exactly one code per request id.

## 3.1 Scenario: Nominal ticketing

1. `fan-a` buys two tickets for Club A and assigns two different attendees.
2. The order contains two tickets, two attendee identities and two unique codes.
3. A third ticket is added for a third attendee; a fifth ticket is refused.
4. A ticket type with `requires_fan_card` refuses a purchase without a card.
5. The same ticket type accepts a valid fan-card number.
6. Club staff list the attendees and see the attendee names and codes.
7. A club analyst requests the attendee list and is refused.
8. Club B requests Club A's attendee list and is refused.
9. A transfer to a new attendee succeeds before the deadline.
10. A transfer after the deadline is refused.
11. A non-transferable ticket is refused.
12. The attendee list contains no prediction position; the prediction insights contain no attendee identity.

### Assertions

- `tickets.buyer_id` is the purchasing fan; the attendee fields are the named person.
- The buyer can purchase for attendees without creating four accounts.
- Max four is enforced in the database transaction, not only in the UI.
- A refused purchase or transfer leaves the order, ticket and attendee state unchanged.
- Attendee identity is visible only to `OWNER`, `ADMIN` and `STAFF`.
- The transfer history records the previous and new attendee.

## 3.2 Scenario: Box office and fan cards

1. Club staff sell a ticket through the box-office command.
2. The order channel is `BOX_OFFICE` and an audit event is written.
3. An `ANALYST` attempts a box-office sale and is refused.
4. The club issues a fan card to a fan.
5. The fan uses the card on a restricted ticket type.
6. A ticket type with an away-sector flag refuses a sale after its cutoff.
7. The club checks in the box-office ticket by code.

## 4. Scenario: Cross-club fan

1. `fan-a` buys a ticket for Club A and a ticket for Club B.
2. `fan-a` predicts on both events.
3. `fan-a portfolio show` lists both positions.
4. Club A's analytics contain only the Club A event.
5. Club B's analytics contain only the Club B event.
6. No club can read the fan's other-club history.

## 5. Scenario: Entitlement denial

| Plan | Attempt | Expected |
| :--- | :--- | :--- |
| STARTER | enable predictions | refused, no market opened |
| STARTER | prediction insights | refused |
| STARTER | export | refused |
| PRO | enable predictions | allowed |
| PRO | prediction insights | allowed |
| PRO | export | refused |
| ELITE | export | allowed, audit event written |

A refusal must leave committed state unchanged.

## 6. Scenario: Authorization denial

- A fan calls a club management command: refused.
- Club A staff calls a Club B command: refused.
- A club `ANALYST` tries to create an event or invite a member: refused.
- A club `ADMIN` tries to change the plan or remove the owner: refused.
- A platform admin tries to change fan points or resolve a market: refused.
- An unauthenticated command: refused with a stable authentication error.

## 7. Scenario: Capacity and concurrency

- 100 fans buy the last tickets concurrently; sold count never exceeds capacity.
- Two requests with the same `--request-id` return the same order and do not double-charge.
- Two check-ins of the same ticket code record one attendance time.
- Two market entries with the same request id produce one trade.

## 8. Scenario: Privacy threshold

- An event with fewer than 5 predictors returns a suppressed cohort.
- An event with 5 or more returns aggregate counts and percentages only.
- No response includes a fan id, email, username or individual position.
- The export contains aggregates, not personal data.

## 9. Evidence

Each scenario writes:

```json
{
  "scenario": "match-day",
  "status": "passed",
  "steps": [
    { "command": "fan tickets buy ...", "exitCode": 0, "json": { "orderId": "..." } }
  ],
  "assertions": [
    { "name": "capacity_not_exceeded", "passed": true }
  ]
}
```

CI uploads the evidence as the `agent-evidence` artifact. A failed step records the command, exit code, stderr and the assertion that failed.

## 10. Limits

The CLI suite does not prove:

- visual layout or accessibility (covered by Playwright and axe);
- email delivery or confirmation (disabled locally);
- real payment processing, refunds or financial KYC (not implemented);
- legal validity of the club terms, privacy notice or attendee retention period;
- deep FIGC/Questura/fan-card integration;
- production availability, latency or recovery.

Nominal attendee identity is event-access data, not financial KYC. The test fixtures are synthetic. Those limits must remain visible in the verification record.
