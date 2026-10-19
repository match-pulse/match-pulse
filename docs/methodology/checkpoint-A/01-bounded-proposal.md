# MatchPulse — Bounded Proposal & Scope

## 1. User & Problem Context
**User:** Football fans participating in local tournaments.
**Problem:** Fans experience frustration and perceived unfairness when late predictions are accepted after a match has kicked off, or when duplicate submissions skew the leaderboard.

## 2. Thin End-to-End Behaviour
A user submits a score prediction for a specific match. The system validates the prediction, locks it exactly at kickoff, and confirms it to the user. Submitting costs 1 point. Retracting a prediction does not refund the point.

## 3. Core Uncertainty
**Concurrency:** If multiple users (or a single user double-clicking) submit predictions at the exact second the referee signals kickoff, will the system allow late predictions or duplicate entries?

## 4. Deliberate Non-Goals
- No real-time API integration for match scores (matches are manually updated by organizers).
- No points calculation or leaderboard logic in this increment.
- No ticket discount payouts or sentiment analysis dashboards.