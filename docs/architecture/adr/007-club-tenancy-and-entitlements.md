# ADR 007: Club Tenancy and Subscription Entitlements

- **Status:** Accepted
- **Date:** 2026-11-09

## Context

The v2 model has global `FAN`, `ORGANIZER` and `CLUB` roles. Tournaments belong to an organizer profile. There is no tenant that represents the paying customer, no way for several staff members to manage the same club, and no plan or entitlement boundary.

The v3 product model makes a club the paying tenant. A club can have several members with different responsibilities, and its subscription plan determines which features it can use.

## Decision

- Introduce `clubs` as the tenant and `club_members` as the membership table.
- Club roles are `OWNER`, `ADMIN`, `STAFF` and `ANALYST`.
- A user may belong to several clubs and may also be a fan.
- Events (`tournaments`) belong to a club through `club_id`; the old organizer ownership is migrated to club ownership.
- Introduce `plans`, `plan_entitlements` and `club_subscriptions`.
- Only an `ACTIVE` subscription grants entitlements.
- Authorization checks identity, club membership, club role and entitlement in the database RPCs and RLS helpers.
- The platform admin is separate from club membership and is covered by ADR-008.

## Consequences

- Every club-scoped RPC and policy must resolve the club and enforce the entitlement.
- Existing organizer-owned data needs a migration path to a club.
- The UI needs a club switcher and a plan/entitlement view.
- Cross-club reads become a security test, not an assumption.
- A plan change affects feature access immediately; existing data remains readable.

## Alternatives considered

- **Keep organizer ownership and add plans per user.** Rejected: it cannot model several staff members or a club-owned subscription.
- **One deployment per club.** Rejected for the course: it avoids the multi-tenant boundary that the architecture should demonstrate.
- **Store entitlements only in the UI.** Rejected: a hidden control is not authorization.
