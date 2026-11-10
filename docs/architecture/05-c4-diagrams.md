# MatchPulse — C4 Views

Four views of the current prototype. The code and
[code map](./04-code-map.md) remain authoritative. Elements that do not exist are
not drawn.

## Level 1 — System context

```mermaid
C4Context
  title MatchPulse — system context

  Person(fan, "Football fan", "Buys tickets and predicts across clubs")
  Person(staff, "Club staff", "Owns events, tickets, attendees and insights")
  Person(admin, "Platform admin", "Manages clubs, plans and audit")
  Person(ops, "Operator", "Runs the CLI, retention and recovery checks")

  System(matchpulse, "MatchPulse", "Club subscriptions, nominal ticketing and aggregate prediction insights")
  System_Ext(supabase, "Supabase", "PostgreSQL, Auth, REST API and local Docker")

  Rel(fan, matchpulse, "Signs up, buys tickets and predicts")
  Rel(staff, matchpulse, "Manages the club and resolves markets")
  Rel(admin, matchpulse, "Manages plans and audit")
  Rel(ops, matchpulse, "Runs maintenance and the CLI")
  Rel(matchpulse, supabase, "Reads, writes and verifies identity")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## Level 2 — Containers

```mermaid
C4Container
  title MatchPulse — containers

  Person(fan, "Football fan", "Buys tickets and predicts")
  Person(staff, "Club staff", "Manages events and attendees")
  Person(admin, "Platform admin", "Manages clubs and plans")

  Container_Boundary(app, "MatchPulse") {
    Container(browser, "Web browser", "React 19", "Renders pages and submits forms")
    Container(web, "Next.js application", "Next.js 16, Bun", "App Router pages, Server Actions, auth proxy")
    Container(cli, "matchpulse CLI", "Bun, TypeScript", "JSON command client for fans, clubs, admin and agents")
    Container(domain, "Shared domain contract", "TypeScript", "Typed wrappers and error mapping used by web and CLI")
  }

  Container(auth, "Supabase Auth", "GoTrue", "Email/password identity and sessions")
  ContainerDb(db, "PostgreSQL", "Supabase Postgres 17", "Clubs, tickets, markets, RLS and RPCs")

  Rel(fan, browser, "Uses")
  Rel(staff, browser, "Uses")
  Rel(admin, browser, "Uses")
  Rel(fan, cli, "Uses")
  Rel(staff, cli, "Uses")
  Rel(admin, cli, "Uses")
  Rel(browser, web, "Loads")
  Rel(web, domain, "Calls")
  Rel(cli, domain, "Calls")
  Rel(domain, auth, "Signs in and refreshes the session")
  Rel(domain, db, "Authorized reads and RPCs")

  UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")
```

There is one application container and one CLI. The browser does not query the
database directly. All users use email/password; the service role is an
operator/fixture credential outside the application runtime.

## Level 3 — Market trading components

```mermaid
C4Component
  title MatchPulse — market trading components

  Container_Boundary(web, "Next.js application") {
    Component(page, "Market page", "React Server Component", "Loads the market, prices and recent trades")
    Component(trader, "MarketTrader", "React Client Component", "Entry and exit forms")
    Component(actions, "Market actions", "Server Actions", "Validates input and calls the shared domain")
    Component(domain, "Domain contract", "TypeScript", "Typed open/close/resolve wrappers and error mapping")
    Component(session, "Session seam", "TypeScript", "getCurrentUser()/requireUser()")
    Component(client, "Supabase server client", "@supabase/ssr", "Cookie-based anon-key client")
  }

  Container(auth, "Supabase Auth", "GoTrue", "Identity and sessions")
  ContainerDb(db, "PostgreSQL", "Supabase Postgres 17", "Domain tables, RLS, grants and functions")

  Rel(trader, actions, "Submits")
  Rel(page, client, "Reads")
  Rel(actions, domain, "Calls")
  Rel(actions, session, "Resolves caller")
  Rel(domain, client, "Calls")
  Rel(client, auth, "Authenticates")
  Rel(client, db, "Reads and calls RPCs")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

`resolve_market` is club-aware: a club `OWNER`/`ADMIN`/`STAFF` may resolve a club
market; the legacy organizer rule remains for non-club markets. The CLI exposes
`club predictions resolve`.

## Level 3 — Club and ticketing components

```mermaid
C4Component
  title MatchPulse — club and ticketing components

  Container_Boundary(web, "Next.js application") {
    Component(clubDashboard, "Club dashboard", "React Server Component", "Plan, members, events, rewards and insights")
    Component(eventPage, "Event management", "React Server Component", "Ticket types, matches, attendees and check-in")
    Component(checkout, "EventCheckout", "React Client Component", "1–4 attendee forms, terms and request id")
    Component(adminPage, "Admin console", "React Server Component", "Clubs, plans and audit")
    Component(actions, "Club/fan actions", "Server Actions", "Invite, role, reward, purchase, transfer and resolution")
    Component(domain, "Domain contract", "TypeScript", "Typed club, ticket, analytics and admin wrappers")
  }

  ContainerDb(db, "PostgreSQL", "Supabase Postgres 17", "Clubs, plans, ticket orders, attendees, RLS and RPCs")
  Container(auth, "Supabase Auth", "GoTrue", "Email/password identity")

  Rel(clubDashboard, domain, "Reads")
  Rel(eventPage, domain, "Reads and calls")
  Rel(checkout, actions, "Submits")
  Rel(adminPage, domain, "Reads and calls")
  Rel(actions, domain, "Calls")
  Rel(domain, auth, "Authenticates")
  Rel(domain, db, "Reads and calls RPCs")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

Attendee identity is operational data for the club's own event. Prediction
insights are aggregate-only, with cohorts below 5 suppressed; the two data
surfaces are deliberately separate.
