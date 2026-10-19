# MatchPulse — Bounded Proposal & Scope

## 1. User & Problem Context
**User:** Football fans participating in local tournaments.
**Problem:** Fans need a reliable points balance when making match predictions. Concurrent requests (e.g., double-clicking or opening multiple tabs) that spend the same points more than once could undermine fair play, create negative balances, and destroy trust in the platform.

## 2. Thin End-to-End Behaviour
A user submits a score prediction for a specific match. The system validates the request, atomically deducts 1 point from their profile, and confirms the prediction. Retracting a prediction does not refund the point.

## 3. Core Uncertainty
**Concurrency & Atomicity:** If a user with 1 available point fires two concurrent prediction requests for different matches, will the system allow both to succeed (spending the same point twice), or will it correctly enforce that at most one request succeeds?

## 4. Deliberate Non-Goals
- No real-time API integration for match scores.
- No complex points calculation or leaderboard logic in this increment.
- No ticket discount payouts or sentiment analysis dashboards.