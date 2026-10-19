# MatchPulse — System Dynamics

## 1. Declared Why vs. Observed Goal
- **Declared Why:** To provide fair and accessible tournament registration for local football fans.
- **Observed Goal (Reality):** The system must strictly enforce physical venue limits. If 100 users attempt to register for a 32-slot tournament, the system prioritizes **data integrity** over accepting everyone. It correctly rejects 68 requests to prevent logistical failure.

## 2. Stocks, Flows, and Delays
- **Stock:** Available registration slots in a tournament.
- **Inflow:** Incoming registration requests from users clicking "Register".
- **Outflow:** Confirmed registrations that decrement the available stock.
- **Delay:** The time between a user clicking "Register" and receiving a success or rejection response from the database.

## 3. Competing Mechanisms (Burst Traffic)
When 100 users attempt to register for a 32-slot tournament simultaneously, what causes the 68 rejections?
1. **Mechanism A (Network Saturation):** The server drops requests due to connection limits before they reach the database.
2. **Mechanism B (Database Lock):** The atomic SQL function correctly rejects 68 requests because `current_players >= max_capacity`.
- **Evidence:** `tournament-capacity.test.ts` proves Mechanism B is the active guard. The database correctly rejected 68 requests while successfully inserting exactly 32, with zero network errors.

## 4. Falsifiable Diagnosis
- **Outcome:** 100% capacity enforcement under burst traffic.
- **Next Evidence:** Production telemetry on how many registration requests hit the database versus how many are rejected at the load balancer during a live tournament launch.