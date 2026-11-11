# Course Package — CM0639

This is the short reading path for the two modules. The submission documents are
summaries; the detail is linked.

## The project

MatchPulse is a club-first football ticketing and fan-engagement platform. A club
subscribes to a plan, creates events and matches, sells named tickets, checks
attendees in, and reads aggregate prediction insights for its own matches. Fans
use one email/password account to buy tickets and predict with points across
clubs. A platform admin manages clubs, plans and audit. Commerce is simulated.

The critical rules — capacity, points, ticket codes, club isolation, roles and
resolution — are enforced inside PostgreSQL, not in the UI.

## The claim

> For a club organizer running a match day, MatchPulse keeps ticket sales and
> prediction trades correct under concurrent requests — never overselling, never
> charging twice, never paying a winning share twice, and never exposing another
> club's data — with the limitation that commerce is simulated, the evidence is
> local/CI, and there is no hosted deployment or independent user study.

## Submission documents

| # | Document | Course use | Time |
| :--- | :--- | :--- | :--- |
| 1 | [Kata](../architecture/kata.md) | Task 1: one-page domain brief, broad R1–R8 | 1 minute |
| 2 | [Architecture characteristics](../architecture/03-architecture-characteristics.md) | Task 2: selection and quantified targets | 3 minutes |
| 3 | [Architecture description](../architecture/reports/2026-11-10.md) | Final project: structure, decisions, code references | 3 minutes |
| 4 | [Checkpoints A–E](../methodology/checkpoints/) | Methodology: five one-page evidence stories | 3 minutes each |
| 5 | [Methodology cover](../methodology/reports/2026-11-10.md) | Map of the five checkpoints | 1 minute |
| 6 | [AI use](../methodology/ai-use.md) | Transparency: prompts, corrections, verification | 2 minutes |

The detailed requirements are in
[`requirements.md`](../architecture/requirements.md). The full C4 views, code map,
ADRs and evidence records are linked from the documents; they are not reprinted.

## Agile reading

The project is an evolutionary architecture built in small slices. The domain
contract is stable; delivery is iterative; scope is adaptive. Each slice has an
issue, a bounded scope, a failable test, CI and a review decision. Documentation
is just in time: kata for the problem, characteristics for the qualities, ADRs for
decisions, checkpoints for evidence, verification records for detail.

## What the evidence supports

- The critical database rules have tests observed failing under deliberate
  mutation: 28 fault-injection entries.
- The recorded suite is 57 database/application tests, 2 CLI scenarios and 11
  Playwright journeys.
- Authorization is tested at the database boundary: anonymous access, cross-club
  isolation, roles and direct-write denial.
- Delivery and recovery are exercised in CI: build, health, smoke, migrations and
  a public-schema restore.

## What it does not support

- Production availability, latency or recovery.
- Real payments, KYC, invoicing or settlement.
- Real-user value; no controlled user study.
- An independent security or privacy audit.
- Seat maps, wallet passes, turnstile hardware or FIGC/Questura integration.

## Detail

- [Architecture reference](../architecture/README.md)
- [Methodology records](../methodology/README.md)
- [Findings register](../methodology/findings-register.md)
- [AI transparency log](../methodology/ai-transparency-log.md)
