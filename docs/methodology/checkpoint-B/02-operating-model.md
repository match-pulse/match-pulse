# MatchPulse — Operating Model (AI-DLC)

## 1. The Chosen SDLC: AI-Driven Development Lifecycle (AI-DLC)
As a solo developer, I adopt the **AI-Driven Development Lifecycle (AI-DLC)**. AI acts as a coding assistant, while I retain ultimate responsibility for validation, architecture, and merge approvals (Human-in-the-Loop).

## 2. Phases and Artefacts
- **Inception Phase:** Defined the domain, user stories, and the Tournament Capacity invariant (see Checkpoint A).
- **Construction Phase:** Work is broken into rapid iterations. AI proposes code (Next.js UI, SQL RPCs); I validate the invariants and write the tests to prove them.
- **Operations Phase:** Deployment via Vercel. GitHub Actions runs ESLint and `next build` on every PR to prevent regressions.

## 3. Change Absorption Policy
If an AI-generated feature takes too long or introduces too many bugs, I will reduce the scope of the increment rather than cutting tests or working overtime. Quality is not sacrificed for scope.

## 4. Flow and Feedback (Kanban)
- **Flow:** Tracked on a GitHub Project Board (Enter -> Build -> Review -> Release). Work in progress (WIP) is limited to 1 active PR at a time.
- **Feedback:** CI pipeline catches build errors, linting issues, and missing env vars before merge. The feedback loop is measured in minutes.