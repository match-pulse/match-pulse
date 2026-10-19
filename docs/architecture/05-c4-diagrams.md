# MatchPulse — C4 Diagrams

> **How to read this document.** Three C4 views, all written in Mermaid so they
> render directly from the repository. They describe the current prototype:
> elements that do not exist yet are labelled **Planned**. The authoritative
> structure is the code and the [code map](./04-code-map.md).

## Level 1 — System context

Who uses MatchPulse and which external systems it depends on.

```mermaid
C4Context
  title MatchPulse — System Context

  Person(fan, "Football fan", "Registers and trades on match outcomes")
  Person(organizer, "Tournament organizer", "Runs tournaments and finalises results")

  System(matchpulse, "MatchPulse", "Tournament registration and live prediction market")

  System_Ext(supabase, "Supabase", "PostgreSQL, REST API and local Docker")

  Rel(fan, matchpulse, "Registers and trades")
  Rel(organizer, matchpulse, "Manages matches")
  Rel(matchpulse, supabase, "Reads and writes data")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

The club representative is a planned actor: the insights product is **not
implemented**, so the actor is omitted from the picture. The Supabase dependency
is real; authentication and analytics are not.

## Level 2 — Containers

The deployable/runtime pieces inside MatchPulse.

```mermaid
C4Container
  title MatchPulse — Containers

  Person(fan, "Football fan", "Registers and trades")

  Container_Boundary(app, "MatchPulse") {
    Container(browser, "Web browser", "React 19", "Renders pages and submits forms")
    Container(web, "Next.js application", "Next.js 16, Bun", "App Router pages and Server Actions")
  }

  ContainerDb(db, "PostgreSQL", "Supabase Postgres 17", "Domain tables, constraints and RPCs")

  Rel(fan, browser, "Uses")
  Rel(browser, web, "Loads")
  Rel(web, db, "RPCs")

  UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")
```

There is one application container. Server Components and Server Actions run
inside it; the browser does not query the database directly. Supabase Auth is
**planned**: no identity container exists today.

## Level 3 — Market trading components

The components that implement the market path inside the Next.js container.

```mermaid
C4Component
  title MatchPulse — Market Trading Components

  Container_Boundary(web, "Next.js application") {
    Component(page, "Market page", "React Server Component", "Loads the market, prices and recent trades")
    Component(trader, "MarketTrader", "React Client Component", "Entry and exit forms")
    Component(actions, "Market actions", "Server Actions", "Validates input and calls the RPCs")
    Component(session, "Session seam", "TypeScript", "getCurrentUserId() — demo identity, not authentication")
    Component(client, "Supabase client", "supabase-js", "Anon-key database client")
  }

  ContainerDb(db, "PostgreSQL", "Supabase Postgres 17", "Domain tables and functions")

  Rel(trader, actions, "")
  Rel(page, client, "")
  Rel(actions, session, "")
  Rel(actions, client, "")
  Rel(client, db, "")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

`resolve_market` exists in the database but has no UI component yet; it is
called directly in tests. The session seam is deliberately not authentication
(INV-05).
