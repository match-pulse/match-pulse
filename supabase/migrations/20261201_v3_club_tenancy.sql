-- v3.0.0: club tenancy, subscription plans, nominal ticketing and platform admin.
-- ADR-007: clubs as tenants and entitlements.
-- ADR-010: nominal ticketing and attendee identity.
--
-- Additive migration: the v2 organizer/claim paths remain available until the
-- application is migrated. The v3 RPCs live in a later migration.

-- ---------------------------------------------------------------------------
-- 1. Clubs, members, invitations and platform admins
-- ---------------------------------------------------------------------------

CREATE TABLE public.clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX clubs_created_by_idx ON public.clubs (created_by);

CREATE TABLE public.club_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'STAFF', 'ANALYST')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (club_id, profile_id)
);

CREATE UNIQUE INDEX club_members_one_owner
    ON public.club_members (club_id)
    WHERE role = 'OWNER';

CREATE INDEX club_members_profile_idx ON public.club_members (profile_id);

CREATE TABLE public.club_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    email TEXT NOT NULL CHECK (position('@' in email) > 1),
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'STAFF', 'ANALYST')),
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX club_invites_pending_email
    ON public.club_invites (club_id, lower(email))
    WHERE accepted_at IS NULL;

CREATE TABLE public.platform_admins (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- 2. Plans, entitlements and subscriptions
-- ---------------------------------------------------------------------------

CREATE TABLE public.plans (
    code TEXT PRIMARY KEY CHECK (code IN ('STARTER', 'PRO', 'ELITE')),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.plan_entitlements (
    plan_code TEXT NOT NULL REFERENCES public.plans(code) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    limit_value INT CHECK (limit_value IS NULL OR limit_value >= 0),
    PRIMARY KEY (plan_code, feature)
);

CREATE TABLE public.club_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL UNIQUE REFERENCES public.clubs(id) ON DELETE CASCADE,
    plan_code TEXT NOT NULL REFERENCES public.plans(code) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'PAST_DUE', 'CANCELED')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.club_plan_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    requested_plan TEXT NOT NULL REFERENCES public.plans(code) ON DELETE RESTRICT,
    requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX club_plan_requests_pending
    ON public.club_plan_requests (club_id)
    WHERE status = 'PENDING';

CREATE INDEX club_plan_requests_club_idx
    ON public.club_plan_requests (club_id, created_at DESC);

INSERT INTO public.plans (code, name, description)
VALUES
    ('STARTER', 'Starter', 'Ticketing and basic sales analytics for a small club.'),
    ('PRO', 'Pro', 'Ticketing, prediction markets, aggregate insights and rewards.'),
    ('ELITE', 'Elite', 'Advanced analytics, data export and the full feature set.')
ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description;

INSERT INTO public.plan_entitlements (plan_code, feature, enabled, limit_value)
VALUES
    ('STARTER', 'max_active_events', TRUE, 3),
    ('STARTER', 'max_members', TRUE, 3),
    ('STARTER', 'prediction_markets', FALSE, NULL),
    ('STARTER', 'prediction_insights', FALSE, NULL),
    ('STARTER', 'club_rewards', FALSE, NULL),
    ('STARTER', 'data_export', FALSE, NULL),
    ('STARTER', 'advanced_analytics', FALSE, NULL),
    ('PRO', 'max_active_events', TRUE, 20),
    ('PRO', 'max_members', TRUE, 10),
    ('PRO', 'prediction_markets', TRUE, NULL),
    ('PRO', 'prediction_insights', TRUE, NULL),
    ('PRO', 'club_rewards', TRUE, NULL),
    ('PRO', 'data_export', FALSE, NULL),
    ('PRO', 'advanced_analytics', FALSE, NULL),
    ('ELITE', 'max_active_events', TRUE, NULL),
    ('ELITE', 'max_members', TRUE, NULL),
    ('ELITE', 'prediction_markets', TRUE, NULL),
    ('ELITE', 'prediction_insights', TRUE, NULL),
    ('ELITE', 'club_rewards', TRUE, NULL),
    ('ELITE', 'data_export', TRUE, NULL),
    ('ELITE', 'advanced_analytics', TRUE, NULL)
ON CONFLICT (plan_code, feature) DO UPDATE
    SET enabled = EXCLUDED.enabled,
        limit_value = EXCLUDED.limit_value;

-- ---------------------------------------------------------------------------
-- 3. Club ownership of events and match prediction flag
-- ---------------------------------------------------------------------------

ALTER TABLE public.tournaments
    ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE RESTRICT,
    ADD COLUMN status TEXT NOT NULL DEFAULT 'PUBLISHED'
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'FINISHED', 'CANCELLED')),
    ADD COLUMN published_at TIMESTAMPTZ,
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX tournaments_club_idx ON public.tournaments (club_id);

UPDATE public.tournaments
   SET published_at = created_at
 WHERE status = 'PUBLISHED' AND published_at IS NULL;

ALTER TABLE public.matches
    ADD COLUMN prediction_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- Backfill one legacy club per organizer and link their tournaments.
INSERT INTO public.clubs (name, slug, created_by)
SELECT p.username || ' Club',
       'legacy-' || replace(t.organizer_id::text, '-', ''),
       t.organizer_id
  FROM public.tournaments t
  JOIN public.profiles p ON p.id = t.organizer_id
 WHERE t.organizer_id IS NOT NULL
 GROUP BY t.organizer_id, p.username
ON CONFLICT (slug) DO NOTHING;

UPDATE public.tournaments t
   SET club_id = c.id
  FROM public.clubs c
 WHERE c.created_by = t.organizer_id
   AND t.club_id IS NULL;

INSERT INTO public.club_members (club_id, profile_id, role)
SELECT c.id, c.created_by, 'OWNER'
  FROM public.clubs c
 WHERE c.created_by IS NOT NULL
ON CONFLICT (club_id, profile_id) DO NOTHING;

INSERT INTO public.club_subscriptions (club_id, plan_code, status)
SELECT c.id, 'PRO', 'ACTIVE'
  FROM public.clubs c
ON CONFLICT (club_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Nominal ticketing
-- ---------------------------------------------------------------------------

CREATE TABLE public.ticket_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    sector TEXT NOT NULL DEFAULT 'GENERAL',
    price_cents INT NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
    allocation INT NOT NULL DEFAULT 0 CHECK (allocation >= 0),
    sold_count INT NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
    sales_start TIMESTAMPTZ,
    sales_end TIMESTAMPTZ,
    transfer_deadline TIMESTAMPTZ,
    max_per_buyer INT NOT NULL DEFAULT 4 CHECK (max_per_buyer BETWEEN 1 AND 4),
    requires_fan_card BOOLEAN NOT NULL DEFAULT FALSE,
    transferable BOOLEAN NOT NULL DEFAULT TRUE,
    away_sector BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ticket_types_sold_within_allocation CHECK (sold_count <= allocation),
    CONSTRAINT ticket_types_window CHECK (
        sales_start IS NULL OR sales_end IS NULL OR sales_end > sales_start
    ),
    CONSTRAINT ticket_types_transfer_window CHECK (
        transfer_deadline IS NULL OR sales_end IS NULL OR transfer_deadline <= sales_end
    )
);

CREATE INDEX ticket_types_event_idx ON public.ticket_types (event_id);

CREATE TABLE public.ticket_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE RESTRICT,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity BETWEEN 1 AND 4),
    unit_price_cents INT NOT NULL CHECK (unit_price_cents >= 0),
    total_cents INT NOT NULL CHECK (total_cents >= 0),
    status TEXT NOT NULL DEFAULT 'SIMULATED_PAID'
        CHECK (status IN ('SIMULATED_PAID', 'CANCELLED')),
    channel TEXT NOT NULL DEFAULT 'WEB'
        CHECK (channel IN ('WEB', 'BOX_OFFICE')),
    terms_accepted_at TIMESTAMPTZ NOT NULL,
    request_id UUID NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (buyer_id, request_id)
);

CREATE INDEX ticket_orders_event_idx ON public.ticket_orders (event_id);
CREATE INDEX ticket_orders_buyer_idx ON public.ticket_orders (buyer_id);
CREATE INDEX ticket_orders_type_idx ON public.ticket_orders (ticket_type_id);

ALTER TABLE public.tickets
    ADD COLUMN order_id UUID REFERENCES public.ticket_orders(id) ON DELETE CASCADE,
    ADD COLUMN ticket_type_id UUID REFERENCES public.ticket_types(id) ON DELETE SET NULL,
    ADD COLUMN buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN attendee_first_name TEXT,
    ADD COLUMN attendee_last_name TEXT,
    ADD COLUMN attendee_date_of_birth DATE,
    ADD COLUMN attendee_place_of_birth TEXT,
    ADD COLUMN attendee_tax_code TEXT,
    ADD COLUMN attendee_document TEXT,
    ADD COLUMN fan_card_number TEXT,
    ADD COLUMN ticket_code TEXT,
    ADD COLUMN checked_in_at TIMESTAMPTZ,
    ADD COLUMN checked_in_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.tickets
   SET buyer_id = user_id
 WHERE buyer_id IS NULL;

UPDATE public.tickets
   SET ticket_code = 'MP-' || upper(substr(replace(id::text, '-', ''), 1, 12))
 WHERE ticket_code IS NULL;

ALTER TABLE public.tickets
    ALTER COLUMN ticket_code SET NOT NULL,
    ALTER COLUMN ticket_code SET DEFAULT (
        'MP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
    );

CREATE UNIQUE INDEX tickets_code_unique ON public.tickets (ticket_code);

-- The v2 constraint allowed one claimed ticket per user/tournament. The v3
-- order flow allows up to four nominal tickets per buyer, so the constraint is
-- replaced by a partial unique index for legacy, order-less tickets.
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT conname
          FROM pg_constraint
         WHERE conrelid = 'public.tickets'::regclass
           AND contype = 'u'
           AND pg_get_constraintdef(oid) LIKE '%(tournament_id, user_id)%'
    LOOP
        EXECUTE format('ALTER TABLE public.tickets DROP CONSTRAINT %I', constraint_name);
    END LOOP;
END;
$$;

CREATE UNIQUE INDEX tickets_legacy_unique
    ON public.tickets (tournament_id, user_id)
    WHERE order_id IS NULL;

CREATE INDEX tickets_order_idx ON public.tickets (order_id);
CREATE INDEX tickets_code_idx ON public.tickets (ticket_code);

CREATE TABLE public.ticket_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    previous_first_name TEXT NOT NULL,
    previous_last_name TEXT NOT NULL,
    previous_date_of_birth DATE,
    previous_place_of_birth TEXT,
    previous_tax_code TEXT,
    new_first_name TEXT NOT NULL,
    new_last_name TEXT NOT NULL,
    new_date_of_birth DATE,
    new_place_of_birth TEXT,
    new_tax_code TEXT,
    requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ticket_transfers_ticket_idx
    ON public.ticket_transfers (ticket_id, created_at DESC);

CREATE TABLE public.club_fan_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    card_number TEXT NOT NULL CHECK (length(trim(card_number)) > 0),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'SUSPENDED', 'EXPIRED')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (club_id, card_number)
);

CREATE INDEX club_fan_cards_profile_idx ON public.club_fan_cards (profile_id);

-- Club-scoped rewards; legacy global rewards keep a null club_id.
ALTER TABLE public.rewards
    ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;

CREATE INDEX rewards_club_idx ON public.rewards (club_id);

-- Club-scoped audit events.
ALTER TABLE public.audit_events
    ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL;

CREATE INDEX audit_events_club_idx
    ON public.audit_events (club_id, created_at DESC);

-- Prediction trades are refused when the match has predictions disabled.
CREATE OR REPLACE FUNCTION public.enforce_prediction_enabled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_enabled BOOLEAN;
BEGIN
    SELECT mt.prediction_enabled
      INTO v_enabled
      FROM public.markets m
      JOIN public.matches mt ON mt.id = m.match_id
     WHERE m.id = NEW.market_id;

    IF NOT COALESCE(v_enabled, FALSE) THEN
        RAISE EXCEPTION 'predictions are not enabled for this event';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS market_trades_prediction_enabled ON public.market_trades;
CREATE TRIGGER market_trades_prediction_enabled
    BEFORE INSERT ON public.market_trades
    FOR EACH ROW EXECUTE FUNCTION public.enforce_prediction_enabled();
