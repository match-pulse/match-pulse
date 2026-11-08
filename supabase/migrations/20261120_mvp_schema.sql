-- First MVP schema: three roles, organizer ownership, tickets, rewards and audit.
-- Approved plan: docs/product/mvp-scope.md (to be added in Phase 0).
-- Invariants: ticket uniqueness/allocation, reward balance, organizer ownership.

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('FAN', 'ORGANIZER', 'CLUB'));

ALTER TABLE public.tournaments
    ADD COLUMN organizer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN ticket_allocation INT NOT NULL DEFAULT 100
        CHECK (ticket_allocation >= 0),
    ADD COLUMN ticket_points INT NOT NULL DEFAULT 100
        CHECK (ticket_points >= 0);

ALTER TABLE public.matches
    ADD COLUMN tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
    ADD COLUMN home_score INT NOT NULL DEFAULT 0 CHECK (home_score >= 0),
    ADD COLUMN away_score INT NOT NULL DEFAULT 0 CHECK (away_score >= 0);

CREATE TABLE public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    points_awarded INT NOT NULL CHECK (points_awarded >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tournament_id, user_id)
);

CREATE INDEX tickets_tournament_idx ON public.tickets (tournament_id);
CREATE INDEX tickets_user_idx ON public.tickets (user_id);

CREATE TABLE public.rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    cost_points INT NOT NULL CHECK (cost_points > 0),
    discount_percent INT NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.reward_redemptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE RESTRICT,
    points_spent INT NOT NULL CHECK (points_spent > 0),
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX reward_redemptions_user_idx ON public.reward_redemptions (user_id);

CREATE TABLE public.audit_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_events_actor_idx ON public.audit_events (actor_id, created_at DESC);
