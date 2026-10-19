# Checkpoint A: Context, Claims, and Evidence

## 1. The 60-Second Pitch
**Project:** MatchPulse, a football tournament platform.
**User:** Football fans participating in local tournaments.
**Claim:** Fans need reliable points. We believe enforcing atomic database transactions at the prediction level will prevent double-spending and maintain system integrity.

## 2. Document Index
- [Bounded Proposal & Scope](./01-bounded-proposal.md)
- [System Invariants](./02-invariants.md)
- [Product Claims & Limits](./03-product-claims.md)
- [Governance & Escalation](./04-governance.md)

## 3. Executable Evidence (The Invariant Test)
To reduce the uncertainty around double spending, we created an automated test (`tests/invariants/prediction-lock.test.ts`).

**Command Executed:** `bun run tests/invariants/prediction-lock.test.ts`

**Terminal Output:**
```text
⏳ Running Invariant Test: Prediction Kickoff Lock
1. Simulating 20 concurrent prediction requests...
Results: 1 succeeded, 19 rejected, 0 network errors.
✅ PASS: The atomic lock successfully prevented double-predictions.
```

## 4. Decision Map & Next Action
- **Decision Owner:** Tournament Organizer (represented by the Solo Developer for this project).
- **Evidence:** The Behaviour Claim holds true. The atomic lock prevents duplicate entries.
- **Next Action:** Proceed to implement the dedicated `points-accounting.test.ts` to explicitly verify the point deduction invariant (INV-01).