import { type MigrationSource, type Replacement, mutateFunction } from './sql'

export type ExpectedExit = 'fail' | 'pass'
export type MutationKind = 'observed-red' | 'forced-failure'

export type Mutation = {
  id: string
  invariant: string
  description: string
  kind: MutationKind
  applyAs?: 'postgres' | 'supabase_admin'
  test: string
  expected: ExpectedExit
  sql: (source: MigrationSource) => string
}

const WINDOW_GUARD = `    IF v_status <> 'OPEN' THEN
        RAISE EXCEPTION 'market is not open';
    END IF;
    IF NOW() < v_kickoff THEN
        RAISE EXCEPTION 'market has not opened';
    END IF;`

const WINDOW_REPLACEMENT: Replacement[] = [{ find: WINDOW_GUARD, replace: '' }]

const DECAY_BLOCK = `        v_effective_level := GREATEST(
            0,
            v_level - FLOOR(EXTRACT(EPOCH FROM (NOW() - v_next)) / 300)::INT
        );`

const NO_ESCALATION_BLOCK = `        IF NOW() < v_next THEN
            RAISE EXCEPTION 'entry cooldown active';
        END IF;`

const EXIT_COOLDOWN_LOOKUP = `    IF NOW() < v_kickoff THEN
        RAISE EXCEPTION 'market has not opened';
    END IF;`

export const mutations: Mutation[] = [
  {
    id: 'm-inv1-window',
    invariant: 'M-INV1',
    description: 'Remove the market-window guard from open_trade and close_trade.',
    kind: 'observed-red',
    test: 'tests/invariants/market-lifecycle.test.ts',
    expected: 'fail',
    sql: ({ idempotent }) =>
      [
        mutateFunction(idempotent, 'open_trade', WINDOW_REPLACEMENT),
        mutateFunction(idempotent, 'close_trade', WINDOW_REPLACEMENT)
      ].join('\n\n')
  },
  {
    id: 'm-inv2-rollback',
    invariant: 'M-INV2',
    description: 'Force the trade insert to fail after the earlier writes and prove rollback.',
    kind: 'forced-failure',
    test: 'tests/fault-injection/atomic-rollback.fault.ts',
    expected: 'pass',
    sql: () => `CREATE OR REPLACE FUNCTION public.fault_inject_trade_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'fault injection: trade insert failed';
END;
$$;

DROP TRIGGER IF EXISTS fault_inject_trade_insert ON public.market_trades;

CREATE TRIGGER fault_inject_trade_insert
BEFORE INSERT ON public.market_trades
FOR EACH ROW EXECUTE FUNCTION public.fault_inject_trade_insert();`
  },
  {
    id: 'm-inv2-nonateomic',
    invariant: 'M-INV2',
    description:
      'Commit a profile debit on a second connection before raising, proving the rollback test catches a non-atomic side effect.',
    kind: 'observed-red',
    applyAs: 'supabase_admin',
    test: 'tests/fault-injection/atomic-rollback.fault.ts',
    expected: 'fail',
    sql: () => `CREATE EXTENSION IF NOT EXISTS dblink;

CREATE OR REPLACE FUNCTION public.fault_inject_nonateomic_trade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM dblink_connect('fault_inject', 'dbname=postgres user=supabase_admin');
    PERFORM dblink_exec('fault_inject', 'SET session_replication_role = replica');
    PERFORM dblink_exec(
        'fault_inject',
        format(
            'INSERT INTO public.market_trades (id, market_id, user_id, outcome, kind, shares, cost_points, proceeds_points, price_before, price_after, points_after, created_at) VALUES (gen_random_uuid(), %L, %L, %L, %L, %s, %s, %s, %s, %s, %s, NOW())',
            NEW.market_id, NEW.user_id, NEW.outcome, NEW.kind,
            NEW.shares, NEW.cost_points, NEW.proceeds_points,
            NEW.price_before, NEW.price_after, NEW.points_after
        )
    );
    PERFORM dblink_disconnect('fault_inject');
    RAISE EXCEPTION 'fault injection: trade insert failed';
END;
$$;

DROP TRIGGER IF EXISTS fault_inject_trade_insert ON public.market_trades;

CREATE TRIGGER fault_inject_trade_insert
BEFORE INSERT ON public.market_trades
FOR EACH ROW EXECUTE FUNCTION public.fault_inject_nonateomic_trade();`
  },
  {
    id: 'm-inv3-oversell',
    invariant: 'M-INV3',
    description: 'Remove the position guard and the non-negative constraints.',
    kind: 'observed-red',
    test: 'tests/invariants/market-pricing.test.ts',
    expected: 'fail',
    sql: ({ idempotent }) =>
      [
        'ALTER TABLE public.market_positions DROP CONSTRAINT IF EXISTS market_positions_shares_check;',
        'ALTER TABLE public.market_positions DROP CONSTRAINT IF EXISTS market_positions_cost_basis_check;',
        mutateFunction(idempotent, 'close_trade', [
          {
            find: '    IF NOT FOUND OR v_held < p_shares THEN',
            replace: '    IF NOT FOUND THEN'
          }
        ])
      ].join('\n\n')
  },
  {
    id: 'm-inv5-bookkeeping',
    invariant: 'M-INV5',
    description: 'Advance the market quantity without the matching position update.',
    kind: 'observed-red',
    test: 'tests/invariants/market-pricing.test.ts',
    expected: 'fail',
    sql: ({ idempotent }) =>
      mutateFunction(idempotent, 'open_trade', [
        {
          find: '       SET q_home = v_qh,',
          replace: '       SET q_home = v_qh + 1,'
        }
      ])
  },
  {
    id: 'm-inv8-floor',
    invariant: 'M-INV8',
    description: 'Replace the ceil debit with a floor debit.',
    kind: 'observed-red',
    test: 'tests/invariants/market-pricing.test.ts',
    expected: 'fail',
    sql: ({ idempotent }) =>
      mutateFunction(idempotent, 'open_trade', [
        {
          find: 'v_cost := CEIL(v_cost_after - v_cost_before)::INT;',
          replace: 'v_cost := FLOOR(v_cost_after - v_cost_before)::INT;',
          all: true
        }
      ])
  },
  {
    id: 'm-inv7-ladder',
    invariant: 'M-INV7',
    description: 'Disable the +15 second increment in the cooldown ladder.',
    kind: 'observed-red',
    test: 'tests/invariants/market-lifecycle.test.ts',
    expected: 'fail',
    sql: ({ core }) =>
      mutateFunction(core, 'market_cooldown_seconds', [
        {
          find: '15 + (p_level - 1) * 15',
          replace: '15 + (p_level - 1) * 0'
        }
      ])
  },
  {
    id: 'm-inv7-cap',
    invariant: 'M-INV7',
    description: 'Lower the cooldown cap from 600 seconds to 60 seconds.',
    kind: 'observed-red',
    test: 'tests/invariants/market-lifecycle.test.ts',
    expected: 'fail',
    sql: ({ core }) =>
      mutateFunction(core, 'market_cooldown_seconds', [
        {
          find: 'LEAST(600,',
          replace: 'LEAST(60,'
        }
      ])
  },
  {
    id: 'm-inv7-decay',
    invariant: 'M-INV7',
    description: 'Disable the five-minute cooldown decay.',
    kind: 'observed-red',
    test: 'tests/invariants/market-lifecycle.test.ts',
    expected: 'fail',
    sql: ({ idempotent }) =>
      mutateFunction(idempotent, 'open_trade', [
        {
          find: DECAY_BLOCK,
          replace: '        v_effective_level := v_level;'
        }
      ])
  },
  {
    id: 'm-inv7-scope',
    invariant: 'M-INV7',
    description: 'Make the cooldown lookup ignore the market id.',
    kind: 'observed-red',
    test: 'tests/invariants/market-lifecycle.test.ts',
    expected: 'fail',
    sql: ({ idempotent }) =>
      mutateFunction(idempotent, 'open_trade', [
        {
          find: `      FROM public.market_entry_cooldowns
     WHERE market_id = p_market_id AND user_id = v_user_id
       FOR UPDATE;`,
          replace: `      FROM public.market_entry_cooldowns
     WHERE user_id = v_user_id
       FOR UPDATE;`
        }
      ])
  },
  {
    id: 'm-inv7-no-escalation',
    invariant: 'M-INV7',
    description: 'Escalate the cooldown on a refused attempt.',
    kind: 'observed-red',
    test: 'tests/invariants/market-lifecycle.test.ts',
    expected: 'fail',
    sql: ({ idempotent }) =>
      mutateFunction(idempotent, 'open_trade', [
        {
          find: NO_ESCALATION_BLOCK,
          replace: `        IF NOW() < v_next THEN
            UPDATE public.market_entry_cooldowns
               SET level = LEAST(v_level + 1, 40)
             WHERE market_id = p_market_id AND user_id = v_user_id;
            RETURN;
        END IF;`
        }
      ])
  },
  {
    id: 'm-inv7-exit-exemption',
    invariant: 'M-INV7',
    description: 'Make close_trade read the entry cooldown and block exits.',
    kind: 'observed-red',
    test: 'tests/invariants/market-lifecycle.test.ts',
    expected: 'fail',
    sql: ({ idempotent }) =>
      mutateFunction(idempotent, 'close_trade', [
        {
          find: EXIT_COOLDOWN_LOOKUP,
          replace: `${EXIT_COOLDOWN_LOOKUP}
    IF EXISTS (
        SELECT 1 FROM public.market_entry_cooldowns
         WHERE market_id = p_market_id AND user_id = v_user_id
           AND next_entry_at > NOW()
    ) THEN
        RAISE EXCEPTION 'entry cooldown active';
    END IF;`
        }
      ])
  },
  {
    id: 'm-inv1-finished-window',
    invariant: 'M-INV1',
    description: 'Remove the finished-match entry guard from the market-window trigger.',
    kind: 'observed-red',
    test: 'tests/invariants/market-lifecycle.test.ts',
    expected: 'fail',
    sql: ({ marketBinding }) =>
      mutateFunction(marketBinding, 'enforce_market_window', [
        {
          find: `    IF v_match_status = 'FINISHED' THEN
        RAISE EXCEPTION 'market is closed: match is finished';
    END IF;`,
          replace: ''
        }
      ])
  },
  {
    id: 'm-inv1-disable-exit',
    invariant: 'M-INV1',
    description: 'Gate every trade, including exits, on the prediction-enabled flag.',
    kind: 'observed-red',
    test: 'tests/invariants/market-lifecycle.test.ts',
    expected: 'fail',
    sql: ({ marketBinding }) =>
      mutateFunction(marketBinding, 'enforce_prediction_enabled', [
        {
          find: `    IF NEW.kind <> 'BUY' THEN
        RETURN NEW;
    END IF;`,
          replace: ''
        }
      ])
  },
  {
    id: 'm-inv6-score-binding',
    invariant: 'M-INV6',
    description: 'Remove the score-derived winner check from market resolution.',
    kind: 'observed-red',
    test: 'tests/invariants/market-lifecycle.test.ts',
    expected: 'fail',
    sql: ({ marketBinding }) =>
      mutateFunction(marketBinding, 'enforce_market_resolution', [
        {
          find: `    IF NEW.winning_outcome IS DISTINCT FROM v_expected_winner THEN
        RAISE EXCEPTION 'winning outcome does not match the final score';
    END IF;`,
          replace: ''
        }
      ])
  },
  {
    id: 'm-inv6-premature-finish',
    invariant: 'M-INV6',
    description: 'Allow a match to be marked finished before kickoff.',
    kind: 'observed-red',
    test: 'tests/invariants/market-lifecycle.test.ts',
    expected: 'fail',
    sql: ({ marketBinding }) =>
      mutateFunction(marketBinding, 'enforce_match_result_integrity', [
        {
          find: `    IF NEW.status = 'FINISHED' AND NOW() < NEW.kickoff_time THEN
        RAISE EXCEPTION 'cannot finish a match before kickoff';
    END IF;`,
          replace: ''
        }
      ])
  },
  {
    id: 'm-inv6-post-resolution-score',
    invariant: 'M-INV6',
    description: 'Allow a score change after the market has been resolved.',
    kind: 'observed-red',
    test: 'tests/invariants/market-lifecycle.test.ts',
    expected: 'fail',
    sql: ({ marketBinding }) =>
      mutateFunction(marketBinding, 'enforce_match_result_integrity', [
        {
          find: `    IF (NEW.home_score IS DISTINCT FROM OLD.home_score
        OR NEW.away_score IS DISTINCT FROM OLD.away_score)
       AND EXISTS (
           SELECT 1
             FROM public.markets m
            WHERE m.match_id = NEW.id
              AND m.status = 'RESOLVED'
       ) THEN
        RAISE EXCEPTION 'cannot change a score after market resolution';
    END IF;`,
          replace: ''
        }
      ])
  },
  {
    id: 't-inv4-buyer-cap',
    invariant: 'T-INV4',
    description: 'Remove the cumulative buyer-limit comparison from the order trigger.',
    kind: 'observed-red',
    test: 'tests/integration/v3-club-tenancy.test.ts',
    expected: 'fail',
    sql: ({ ticketing }) =>
      mutateFunction(ticketing, 'enforce_ticket_buyer_limit', [
        {
          find: '    IF v_existing + NEW.quantity > v_max_per_buyer THEN',
          replace: '    IF v_existing + NEW.quantity > 999999 THEN'
        }
      ])
  },
  {
    id: 't-inv5-capacity-config',
    invariant: 'T-INV5',
    description: 'Allow an event allocation above its venue capacity.',
    kind: 'observed-red',
    test: 'tests/integration/v3-club-tenancy.test.ts',
    expected: 'fail',
    sql: ({ ticketing }) =>
      mutateFunction(ticketing, 'enforce_event_capacity_config', [
        {
          find: '    IF NEW.ticket_allocation > NEW.max_capacity THEN',
          replace: '    IF NEW.ticket_allocation > 999999 THEN'
        }
      ])
  },
  {
    id: 't-inv11-legacy-claim',
    invariant: 'T-INV11',
    description: 'Remove the club-event refusal from the legacy ticket claim.',
    kind: 'observed-red',
    test: 'tests/integration/v3-club-tenancy.test.ts',
    expected: 'fail',
    sql: ({ ticketing }) =>
      mutateFunction(ticketing, 'claim_ticket', [
        {
          find: `    IF v_club_id IS NOT NULL THEN
        RAISE EXCEPTION 'legacy claim is not available for club events';
    END IF;`,
          replace: ''
        }
      ])
  },
  {
    id: 't-inv11-legacy-registration',
    invariant: 'T-INV11',
    description: 'Remove the club-event refusal from legacy tournament registration.',
    kind: 'observed-red',
    test: 'tests/integration/v3-club-tenancy.test.ts',
    expected: 'fail',
    sql: ({ ticketing }) =>
      mutateFunction(ticketing, 'register_for_tournament', [
        {
          find: `    IF v_club_id IS NOT NULL THEN
        RETURN false;
    END IF;`,
          replace: ''
        }
      ])
  },
  {
    id: 't-inv12-reward-replay',
    invariant: 'T-INV12',
    description: 'Remove the reward replay lookup so a reused request key cannot replay.',
    kind: 'observed-red',
    test: 'tests/integration/mvp-backend.test.ts',
    expected: 'fail',
    sql: ({ reward }) =>
      mutateFunction(reward, 'redeem_reward', [
        {
          find: `    SELECT r.code, r.reward_id, r.points_spent, r.points_after
      INTO v_existing_code, v_existing_reward, v_existing_spent, v_existing_after
      FROM public.reward_redemptions r
     WHERE r.user_id = v_user_id
       AND r.request_id = p_request_id;

    IF FOUND THEN
        IF v_existing_reward <> p_reward_id OR v_existing_spent <> v_cost THEN
            RAISE EXCEPTION 'request id reused with a different payload';
        END IF;

        code := v_existing_code;
        points_after := COALESCE(v_existing_after, v_points);
        RETURN NEXT;
        RETURN;
    END IF;`,
          replace: '    -- fault injection: replay lookup removed'
        }
      ])
  },
  {
    id: 't-inv3-entitlement',
    invariant: 'T-INV3',
    description: 'Remove the active-entitlement check from club event creation.',
    kind: 'observed-red',
    test: 'tests/integration/v3-club-tenancy.test.ts',
    expected: 'fail',
    sql: ({ subscription }) =>
      mutateFunction(subscription, 'create_club_event', [
        {
          find: "    PERFORM public.require_entitlement(p_club_id, 'max_active_events');",
          replace: ''
        }
      ])
  },
  {
    id: 't-inv10-transfer-retention',
    invariant: 'T-INV10',
    description: 'Stop redacting the previous attendee identity from transfer history.',
    kind: 'observed-red',
    test: 'tests/integration/v3-club-tenancy.test.ts',
    expected: 'fail',
    sql: ({ privacy }) =>
      mutateFunction(privacy, 'cleanup_expired_attendee_data', [
        {
          find: '       SET previous_first_name = NULL,',
          replace: '       SET previous_first_name = previous_first_name,'
        }
      ])
  },
  {
    id: 't-inv10-audit-retention',
    invariant: 'T-INV10',
    description: 'Stop removing the card number from old fan-card audit metadata.',
    kind: 'observed-red',
    test: 'tests/integration/v3-club-tenancy.test.ts',
    expected: 'fail',
    sql: ({ privacy }) =>
      mutateFunction(privacy, 'cleanup_expired_attendee_data', [
        {
          find: "       SET metadata = metadata - 'card_number'",
          replace: '       SET metadata = metadata'
        }
      ])
  },
  {
    id: 't-inv10-invite-retention',
    invariant: 'T-INV10',
    description: 'Stop deleting accepted or expired invitation emails after the retention window.',
    kind: 'observed-red',
    test: 'tests/integration/v3-club-tenancy.test.ts',
    expected: 'fail',
    sql: ({ privacy }) =>
      mutateFunction(privacy, 'cleanup_expired_attendee_data', [
        {
          find: `    DELETE FROM public.club_invites
     WHERE (accepted_at IS NOT NULL AND accepted_at < NOW() - p_older_than)
        OR (accepted_at IS NULL AND expires_at < NOW() - p_older_than);

    GET DIAGNOSTICS v_invites = ROW_COUNT;`,
          replace: '    v_invites := 0;'
        }
      ])
  },
  {
    id: 't-inv8-cohort-suppression',
    invariant: 'T-INV8',
    description: 'Show every outcome cohort regardless of the five-predictor threshold.',
    kind: 'observed-red',
    test: 'tests/integration/v3-club-tenancy.test.ts',
    expected: 'fail',
    sql: ({ privacy }) =>
      mutateFunction(privacy, 'club_prediction_insights', [
        {
          find: 'CASE WHEN COALESCE(mt.traders, 0) >= 5 THEN',
          replace: 'CASE WHEN TRUE THEN',
          all: true
        }
      ])
  },
  {
    id: 't-inv13-ticket-payload',
    invariant: 'T-INV13',
    description: 'Ignore the stored attendee payload when replaying a ticket request key.',
    kind: 'observed-red',
    test: 'tests/integration/v3-club-tenancy.test.ts',
    expected: 'fail',
    sql: ({ payload }) =>
      mutateFunction(payload, 'purchase_ticket', [
        {
          find: '           OR (v_existing_payload IS NOT NULL AND v_existing_payload <> v_payload_hash) THEN',
          replace: '           OR FALSE THEN'
        }
      ])
  }
]
