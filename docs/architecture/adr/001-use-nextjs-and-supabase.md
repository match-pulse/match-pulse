# ADR 001: Use Next.js, Supabase, and Vercel

## Context
MatchPulse requires high elasticity to handle bursts of predictions during live matches, rapid deployment (Time to Market), and strong data integrity for concurrency. 

## Decision
We will use Next.js (App Router) for the frontend/backend, Supabase (PostgreSQL) for the database and atomic RPCs, and Vercel for hosting.

## Consequences
- **Positive:** Instant CI/CD (Deployability), Edge network (Scalability), and Row-Level Security (Reliability). 
- **Negative:** Vendor lock-in with Vercel and Supabase. We must rely on Supabase's database limits for heavy analytical queries (Sentiment Analysis).