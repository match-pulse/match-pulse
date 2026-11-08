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

Every entry/exit carries a client-generated request key. The key is reused on retry and rotated only after success or a payload change. The request row and trade commit or roll back together.

## 4. Limits

No production failover, multi-instance retry coordination, external alerting or measured RTO/RPO. The recovery drill covers the application-owned `public` schema only.
