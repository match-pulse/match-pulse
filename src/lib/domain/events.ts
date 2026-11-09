import type { SupabaseClient } from '@supabase/supabase-js'
import { callRpc, first, selectOne, selectRows } from './rpc'
import type {
  ClubEvent,
  ClubMatch,
  PublicEvent,
  PublicMatch,
  PublicTicketType,
  TicketType
} from './types'

export async function createClubEvent(
  client: SupabaseClient,
  clubId: string,
  name: string,
  maxCapacity: number,
  ticketAllocation = 100,
  ticketPoints = 0
): Promise<string> {
  return callRpc<string>(client, 'create_club_event', {
    p_club_id: clubId,
    p_name: name,
    p_max_capacity: maxCapacity,
    p_ticket_allocation: ticketAllocation,
    p_ticket_points: ticketPoints
  })
}

export async function updateClubEvent(
  client: SupabaseClient,
  eventId: string,
  name: string,
  maxCapacity: number,
  ticketAllocation: number,
  ticketPoints: number
): Promise<void> {
  await callRpc<void>(client, 'update_club_event', {
    p_event_id: eventId,
    p_name: name,
    p_max_capacity: maxCapacity,
    p_ticket_allocation: ticketAllocation,
    p_ticket_points: ticketPoints
  })
}

export async function publishClubEvent(
  client: SupabaseClient,
  eventId: string
): Promise<void> {
  await callRpc<void>(client, 'publish_club_event', { p_event_id: eventId })
}

export async function listClubEvents(
  client: SupabaseClient,
  clubId: string
): Promise<ClubEvent[]> {
  return callRpc<ClubEvent[]>(client, 'list_club_events', { p_club_id: clubId })
}

export async function createClubMatch(
  client: SupabaseClient,
  eventId: string,
  homeTeam: string,
  awayTeam: string,
  kickoff: string,
  predictionEnabled = false
): Promise<{ match_id: string; market_id: string | null }> {
  const rows = await callRpc<Array<{ match_id: string; market_id: string | null }>>(
    client,
    'create_club_match',
    {
      p_event_id: eventId,
      p_home_team: homeTeam,
      p_away_team: awayTeam,
      p_kickoff: kickoff,
      p_prediction_enabled: predictionEnabled
    }
  )
  const row = first(rows)
  if (!row) throw new Error('Match was not created.')
  return row
}

export async function updateClubMatch(
  client: SupabaseClient,
  matchId: string,
  homeScore: number,
  awayScore: number,
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED'
): Promise<void> {
  await callRpc<void>(client, 'update_club_match', {
    p_match_id: matchId,
    p_home_score: homeScore,
    p_away_score: awayScore,
    p_status: status
  })
}

export async function setPredictionEnabled(
  client: SupabaseClient,
  matchId: string,
  enabled: boolean
): Promise<void> {
  await callRpc<void>(client, 'set_prediction_enabled', {
    p_match_id: matchId,
    p_enabled: enabled
  })
}

export async function listClubMatches(
  client: SupabaseClient,
  eventId: string
): Promise<ClubMatch[]> {
  return callRpc<ClubMatch[]>(client, 'list_club_matches', { p_event_id: eventId })
}

export async function createTicketType(
  client: SupabaseClient,
  input: {
    eventId: string
    name: string
    sector?: string
    priceCents?: number
    allocation?: number
    salesStart?: string | null
    salesEnd?: string | null
    transferDeadline?: string | null
    maxPerBuyer?: number
    requiresFanCard?: boolean
    transferable?: boolean
    awaySector?: boolean
  }
): Promise<string> {
  return callRpc<string>(client, 'create_ticket_type', {
    p_event_id: input.eventId,
    p_name: input.name,
    p_sector: input.sector ?? 'GENERAL',
    p_price_cents: input.priceCents ?? 0,
    p_allocation: input.allocation ?? 0,
    p_sales_start: input.salesStart ?? null,
    p_sales_end: input.salesEnd ?? null,
    p_transfer_deadline: input.transferDeadline ?? null,
    p_max_per_buyer: input.maxPerBuyer ?? 4,
    p_requires_fan_card: input.requiresFanCard ?? false,
    p_transferable: input.transferable ?? true,
    p_away_sector: input.awaySector ?? false
  })
}

export async function listClubTicketTypes(
  client: SupabaseClient,
  eventId: string
): Promise<TicketType[]> {
  return callRpc<TicketType[]>(client, 'list_club_ticket_types', { p_event_id: eventId })
}

export async function listPublicEvents(client: SupabaseClient): Promise<PublicEvent[]> {
  return selectRows<PublicEvent>(
    client.from('public_events').select('*').order('published_at', { ascending: false })
  )
}

export async function getPublicEvent(
  client: SupabaseClient,
  eventId: string
): Promise<{
  event: PublicEvent | null
  ticketTypes: PublicTicketType[]
  matches: PublicMatch[]
}> {
  const [event, ticketTypes, matches] = await Promise.all([
    selectOne<PublicEvent>(client.from('public_events').select('*').eq('id', eventId).maybeSingle()),
    selectRows<PublicTicketType>(
      client.from('public_ticket_types').select('*').eq('event_id', eventId).order('name')
    ),
    selectRows<PublicMatch>(
      client.from('public_matches').select('*').eq('tournament_id', eventId).order('kickoff_time')
    )
  ])
  return { event, ticketTypes, matches }
}
