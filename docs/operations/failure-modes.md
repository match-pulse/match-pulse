# Failure Modes and Recovery

## 1. Save/trade failures

| Point of failure | State | Response |
| :--- | :--- | :--- |
| Before commit | No trade, position or debit exists | Retry with the same request key |
| After commit, response lost | Data exists; client is uncertain | Retry with the same request key; the recorded trade is replayed |
| Duplicate request | Same key and payload | Original trade returned; no second debit/credit |
| Same key, different payload | No new trade | Request refused; client must refresh and use a new key |
| Market resolved during request | Market terminal | Request refused; no partial writes |

## 2. Database and delivery

- Health `503`: app is up but database read failed; check Supabase status and logs.
- Migration failure: do not edit applied migrations; add a corrective migration.
- Bad release: select the previous tag and verify health/smoke; release a new PATCH tag.
- Local data loss: restore from a verified local dump; do not reset data without approval.

## 3. Retry contract

Every entry/exit carries a client-generated request key. The key is reused on retry and rotated only after success or a payload change. The request row and trade commit or roll back together. Ticket purchases use the same pattern; check-in is idempotent by ticket code.

## 3.1 v3.0.0 failure modes

| Failure | State | Recovery |
| :--- | :--- | :--- |
| Ticket purchase retried | One order/tickets per request id | Replay the order; rotate only after success |
| Ticket check-in retried | First check-in time retained | Return `already_checked_in`; no duplicate attendance |
| Plan downgraded below usage | Existing events remain; new creation blocked | Upgrade or reduce usage; no destructive migration |
| Subscription `PAST_DUE`/`CANCELED` | Gated features refused | Restore `ACTIVE` via platform admin |
| Attendee identity exposed to the wrong club role | RLS/RPC refusal | Investigate audit; rotate/limit access |
| CLI session lost/expired | No user session | `matchpulse auth login` again; stored profile has no service role |
| Retention cleanup fails | Identity remains | Run `bun run maintenance:cleanup-attendees` again; check the audit event |
| Legacy page used after v3 | Legacy path remains; v3 data may not appear | Use the v3 surfaces; legacy pages are compatibility only |

## 4. Limits

No production failover, multi-instance retry coordination, external alerting or measured RTO/RPO. The recovery drill covers the application-owned `public` schema only. No real payments or financial KYC are in scope.
