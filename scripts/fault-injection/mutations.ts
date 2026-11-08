import { type MigrationSource, type Replacement, mutateFunction } from './sql'

export type ExpectedExit = 'fail' | 'pass'
export type MutationKind = 'observed-red' | 'forced-failure'

export type Mutation = {
  id: string
  invariant: string
  description: string
  kind: MutationKind
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
  }
]
