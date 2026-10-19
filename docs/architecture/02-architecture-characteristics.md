# MatchPulse — Architecture Characteristics

## 1. Domain Concerns Mapping
Based on the business goals of MatchPulse, we must identify which architecture characteristics (non-functional requirements) are critical for success. 

| Domain Concern | Required Architecture Characteristics | How MatchPulse Achieves It |
| :--- | :--- | :--- |
| **Time to Market** | Deployability, Testability | Next.js + Vercel provides instant CI/CD previews. Bun allows rapid local builds. Invariant tests automate the validation of core logic. |
| **User Satisfaction** | Elasticity, Scalability, Performance | Supabase (PostgreSQL) handles concurrent connection bursts. Vercel's Edge network ensures low-latency responses globally during live matches. |
| **Competitive Advantage** | Scalability, Modularity | The separation of the Prediction engine and the future Sentiment Analysis engine allows us to scale them independently. |
| **Reliability** | Fault Tolerance, Integrity | Atomic database transactions (`submit_prediction` RPC) ensure data integrity even under extreme network latency or race conditions. |

## 2. Chosen Characteristics (The Minimal Set)
We focus only on the characteristics that are essential to prevent the system from failing.

1.  **Elasticity:** The system must handle a burst of users (e.g., 10,000 fans logging in exactly at kickoff to submit their final predictions). 
2.  **Deployability:** Features must be deployed frequently without downtime. Next.js + Vercel satisfies this natively.
3.  **Testability:** The core business invariants (preventing double-booking or late predictions) must be automatically testable outside of the UI. This is achieved via our `tests/invariants` suite.

## 3. Trade-offs & The "Least Worst" Architecture
Every architecture decision involves trade-offs. We deliberately accepted the following constraints:

*   **Managed Services vs. Control:** By choosing Supabase and Vercel, we sacrifice deep infrastructure control in exchange for **Deployability** and **Time to Market**.
*   **Complexity vs. Performance:** We implemented database-level RPCs (PostgreSQL functions) instead of handling logic in the Next.js API routes. This slightly increases database coupling, but massively increases **Reliability** and **Integrity**.
*   **No CQRS/Event Sourcing:** For this MVP phase, we chose a traditional relational model over complex Event-Driven architecture. This prioritizes **Simplicity** and **Overall Cost** over theoretical extreme scalability, as 99% of tournaments will not exceed the limits of a standard Postgres instance.

## 4. Conclusion
By focusing on a minimal set of characteristics (Elasticity, Deployability, Testability), MatchPulse achieves its business goals without over-engineering. The system is designed to be robust under load while remaining simple enough for a small team to maintain.