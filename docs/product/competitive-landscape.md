# Competitive Landscape — Italian Football Ticketing

- **Date:** 2026-11-09
- **Status:** Current product note for the v3.0.0 club-subscription model.
- **Related:** [MVP scope](./mvp-scope.md), [ADR-007](../architecture/adr/007-club-tenancy-and-entitlements.md), [ADR-010](../architecture/adr/010-nominal-ticketing-and-attendee-identity.md)

## 1. How Italian fans buy tickets

The club is the organizer and seller. Fans buy through:

- the club's official website or app;
- an official ticketing partner such as TicketOne or Vivaticket;
- authorized physical outlets and the stadium box office.

TicketOne and Vivaticket are channels/technology partners, not the organizer. The club's official channel is the trust anchor.

Evidence:

- [Inter ticket conditions](https://www.inter.it/it/condizioni-di-vendita-per-la-stagione-sportiva-25-26) — nominative ticket, purchase on `inter.it` and authorized points, ID at entry, limited transferability.
- [Torino FAQ](https://www.torinofc.it/fan/faq-del-tifoso) — home tickets on `torinofc.it`/Vivaticket, authorized points and stadium box office; ID at purchase and entry; maximum four tickets; away-sector sales end the day before; name-change procedure; limited refunds.
- [Juventus ticketing](https://www.juventus.com/it/biglietti/standard/prima-squadra-maschile/) — Official Ticket Shop is the only official channel; MyJuve account; maximum four tickets; 100% digital tickets from 2026-27; name change up to four hours before kickoff.
- [Roma ticketing](https://www.asroma.com/it/biglietti/maschile) — digital-only tickets via app and wallet.

## 2. Competitive set

| Provider | Role | Strength | Limit for a local club |
| :--- | :--- | :--- | :--- |
| **TicketOne** | Official sales circuit and technology partner | Distribution, box-office integrations, established trust | Club is one tenant among many; less focus on small clubs and fan engagement |
| **Vivaticket** | Official circuit and local outlet network | Physical outlets, local presence | Ticketing-first; prediction/insights are not the core |
| **Ticketmaster Italy** | Large-scale ticketing and distribution | Scale, brand, integrations | Optimised for large venues and events, not local football clubs |
| **Club in-house / legacy box office** | Direct club sales | Trust, cash, local control | Manual, limited digital data, weak fan engagement |
| **Secondary marketplaces** | Resale | Consumer reach | Not an official channel; legally risky for nominative football tickets |

## 3. MatchPulse positioning

> The club's official ticket shop, fan prediction game and fan-data dashboard — branded as the club, paid for by the club.

MatchPulse is **not** a central consumer marketplace. It is a white-label B2B platform:

- the club keeps its brand, terms, privacy notice and fan relationship;
- the club is the organizer and merchant;
- MatchPulse provides the storefront, nominal ticketing, check-in, predictions and aggregate insights;
- the club pays a subscription, not the fan.

## 4. Differentiation

- **Club-owned fan relationship.** The club's brand and data, not a marketplace listing.
- **Prediction engagement.** A free-to-play points game that gives the club aggregate insight, not betting.
- **Simple local-club setup.** Events, ticket types, box office and check-in in one flow.
- **Data ownership.** The club sees its own aggregate prediction data; the platform does not sell personal data.
- **Nominal ticketing done properly.** Buyer/attendee separation, identity fields, max four, digital QR, name change and fan-card rules.

## 5. What MatchPulse does not claim in v3.0.0

- Parity with TicketOne/Vivaticket on seat maps, turnstile hardware, distribution or payment integrations.
- Real payment processing, refunds or settlement.
- Deep FIGC/Questura/fan-card integration.
- Apple/Google Wallet passes.
- Large-venue or concert ticketing.

These are later integrations or explicit non-goals. The course prototype demonstrates the club-owned, prediction-enabled model with simulated commerce.
