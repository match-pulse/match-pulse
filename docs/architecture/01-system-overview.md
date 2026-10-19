# MatchPulse — System Overview & Domain Model

## 1. Domain Entities

The MatchPulse system is built around the following core entities:

- **Profile:** Represents a fan or participant. Stores the user's identity, role, and available prediction points.
- **Tournament:** Contains participating teams and scheduled matches. Defines a maximum participant capacity (`max_capacity`).
- **Team:** Represents a football team participating in a tournament.
- **Match:** Represents a fixture between two teams. Stores the home and away teams, kickoff timestamp, result, and status (`SCHEDULED`, `LIVE`, `FINISHED`).
- **Registration:** Links a profile to a tournament and ensures participant capacity is respected.
- **Prediction:** Records a participant's predicted home and away scores for a match. Predictions can be withdrawn before kickoff, but spent points are not refunded.
- **Points Ledger:** Records point grants, prediction costs, prediction rewards, and redemptions for ticket discounts.

## 2. Primary User Journeys

1. **Organizer:** Creates tournaments, manages teams, schedules matches, and records final results.
2. **Fan Registration:** Registers for a tournament while capacity remains and receives an initial allocation of prediction points.
3. **Fan Prediction:** Submits a score prediction for a scheduled match, spending one point. A prediction may be withdrawn before kickoff, without a refund.
4. **Prediction Lock:** The system rejects submissions at or after kickoff, even if the match status has not yet been updated to `LIVE`.
5. **Rewards:** Once a match result is finalized, correct predictions earn points according to the scoring rules. Accumulated points can be redeemed for future ticket discounts.
6. **Club Analytics:** Soccer clubs purchase aggregated crowd-sentiment insights derived from prediction activity.

## 3. High-Level System Architecture

MatchPulse follows a modular monolith architecture using Next.js and Supabase, with PostgreSQL as the source of truth for domain data and transactional integrity.

- **Frontend (Next.js App Router):** Renders the web interface using React Server Components and provides the prediction and tournament-management experiences.
- **Application Layer (Next.js Server Actions):** Handles authenticated requests, validates input, invokes database operations, and refreshes affected views.
- **Database (Supabase / PostgreSQL):** Stores domain data and enforces critical business invariants through transactions, constraints, Row Level Security (RLS), and atomic database functions (RPCs).
- **Infrastructure:** Uses Bun for package management and runtime tooling, Docker for local Supabase development, Vercel for deployment, and GitHub Actions for CI.

Critical operations, including tournament registration and prediction submission, must enforce their invariants within the database transaction rather than relying solely on frontend or application-level checks.

Prediction activity is linked to profiles internally and aggregated into crowd-sentiment insights for clubs. Access to underlying user data must follow defined authorization and privacy rules.

## 4. Data Flow — Submit Prediction

1. The authenticated fan submits a score prediction through the Next.js interface.
2. The Server Action validates the request and invokes the `submit_prediction()` Supabase RPC.
3. The database function identifies the authenticated participant and locks the relevant records as needed to coordinate concurrent requests.
4. The function verifies that the match is still eligible for predictions, the database clock is before kickoff, the participant has sufficient points, and no conflicting active prediction exists.
5. Within the same transaction, the database deducts one point, records the corresponding ledger entry, and stores the prediction.
6. If any validation or database operation fails, the transaction rolls back, leaving neither a partial prediction nor an unintended point deduction.
7. The Server Action returns the result, and Next.js refreshes the affected views.

### Core Invariants

- **Prediction deadline:** No prediction can be submitted at or after the match's kickoff timestamp.
- **Concurrency safety:** Concurrent requests cannot create duplicate active predictions or spend the same available points more than once.
- **Atomic accounting:** Prediction storage, point deduction, and ledger recording succeed or fail together.
- **Tournament capacity:** Concurrent registrations cannot exceed the tournament's maximum participant capacity.
- **Reward consistency:** Finalized results and associated point rewards must be recorded consistently.
- **Access control:** Users can only perform authorized actions, and club analytics access must respect the defined data-sharing rules.