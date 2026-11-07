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

  System_Ext(supabase, "Supabase", "PostgreSQL, REST API, Auth and local Docker")

  Rel(fan, matchpulse, "Signs in, registers and trades")
  Rel(organizer, matchpulse, "Signs in and resolves markets")
  Rel(matchpulse, supabase, "Reads, writes and verifies identity")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

The club representative is a planned actor: the insights product is **not
implemented**, so the actor is omitted from the picture. The Supabase dependency
is real, including Auth; analytics is not.

## Level 2 — Containers

The deployable/runtime pieces inside MatchPulse.

```mermaid
C4Container
  title MatchPulse — Containers

  Person(fan, "Football fan", "Registers and trades")

  Container_Boundary(app, "MatchPulse") {
    Container(browser, "Web browser", "React 19", "Renders pages and submits forms")
    Container(web, "Next.js application", "Next.js 16, Bun", "App Router pages, Server Actions and auth proxy")
  }

  Container(auth, "Supabase Auth", "GoTrue", "Anonymous fan and email/password organizer identity")
  ContainerDb(db, "PostgreSQL", "Supabase Postgres 17", "Domain tables, constraints, RLS and RPCs")

  Rel(fan, browser, "Uses")
  Rel(browser, web, "Loads")
  Rel(web, auth, "Signs in and refreshes the session")
  Rel(web, db, "Authenticated RPCs")

  UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")
```

There is one application container. Server Components and Server Actions run
inside it; the browser does not query the database directly. Supabase Auth is
implemented: fans use anonymous sign-in, organizers use email/password, and the
database verifies the JWT through `auth.uid()`.

## Level 3 — Market trading components

The components that implement the market path inside the Next.js container.

```mermaid
C4Component
  title MatchPulse — Market Trading Components

  Container_Boundary(web, "Next.js application") {
    Component(page, "Market page", "React Server Component", "Loads the market, prices and recent trades")
    Component(trader, "MarketTrader", "React Client Component", "Entry and exit forms")
    Component(actions, "Market actions", "Server Actions", "Validates input and calls the RPCs")
    Component(authActions, "Auth actions", "Server Actions", "Anonymous/organizer sign-in and sign-out")
    Component(session, "Session seam", "TypeScript", "getCurrentUser()/requireUser() — Supabase Auth session")
    Component(client, "Supabase server client", "@supabase/ssr", "Cookie-based anon-key client")
  }

  Container(auth, "Supabase Auth", "GoTrue", "Identity and sessions")
  ContainerDb(db, "PostgreSQL", "Supabase Postgres 17", "Domain tables, RLS, grants and functions")

  Rel(trader, actions, "")
  Rel(page, client, "")
  Rel(authActions, auth, "")
  Rel(actions, session, "")
  Rel(actions, client, "")
  Rel(client, auth, "")
  Rel(client, db, "")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

`resolve_market` exists in the database and is authorized by the organizer role;
there is no browser management component yet, so it is exercised in tests. The
session seam reads Supabase Auth; the database still enforces every rule with
`auth.uid()`.
