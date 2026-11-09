export type ProfileSummary = {
  id: string
  username: string
  points: number
}

export type ClubSummary = {
  club_id: string
  name: string
  slug: string
  role: 'OWNER' | 'ADMIN' | 'STAFF' | 'ANALYST'
  plan_code: string | null
  subscription_status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | null
}

export type ClubEntitlement = {
  enabled: boolean
  limit: number | null
}

export type ClubContext = {
  club: { id: string; name: string; slug: string }
  role: ClubSummary['role']
  plan: string | null
  subscription_status: ClubSummary['subscription_status']
  entitlements: Record<string, ClubEntitlement>
}

export type ClubMember = {
  profile_id: string
  username: string
  role: ClubSummary['role']
  created_at: string
}

export type ClubEvent = {
  id: string
  name: string
  status: 'DRAFT' | 'PUBLISHED' | 'FINISHED' | 'CANCELLED'
  max_capacity: number
  current_players: number
  ticket_allocation: number
  ticket_points: number
  published_at: string | null
  created_at: string
  club_id?: string
}

export type ClubMatch = {
  match_id: string
  home_team: string
  away_team: string
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED'
  kickoff_time: string
  home_score: number
  away_score: number
  prediction_enabled: boolean
  market_id: string | null
  market_status: 'OPEN' | 'RESOLVED' | null
}

export type TicketType = {
  ticket_type_id: string
  name: string
  sector: string
  price_cents: number
  allocation: number
  sold_count: number
  sales_start: string | null
  sales_end: string | null
  transfer_deadline: string | null
  max_per_buyer: number
  requires_fan_card: boolean
  transferable: boolean
  away_sector: boolean
  active: boolean
}

export type PublicEvent = {
  id: string
  name: string
  max_capacity: number
  ticket_allocation: number
  ticket_points: number
  status: string
  published_at: string | null
  club_id: string
  club_name: string
  club_slug: string
}

export type PublicTicketType = {
  id: string
  event_id: string
  name: string
  sector: string
  price_cents: number
  allocation: number
  sold_count: number
  sales_start: string | null
  sales_end: string | null
  transfer_deadline: string | null
  max_per_buyer: number
  requires_fan_card: boolean
  transferable: boolean
  away_sector: boolean
}

export type PublicMatch = {
  id: string
  tournament_id: string
  home_team: string
  away_team: string
  status: string
  kickoff_time: string
  home_score: number
  away_score: number
  prediction_enabled: boolean
  market_id: string | null
  market_status: string | null
  winning_outcome: string | null
}

export type AttendeeInput = {
  first_name: string
  last_name: string
  date_of_birth: string
  place_of_birth: string
  tax_code?: string
  document?: string
  fan_card_number?: string
}

export type PurchaseResult = {
  order_id: string
  ticket_ids: string[]
  ticket_codes: string[]
  total_cents: number
  points_after: number
}

export type MyTicket = {
  ticket_id: string
  order_id: string
  event_id: string
  event_name: string
  club_name: string
  ticket_type: string | null
  attendee_first_name: string | null
  attendee_last_name: string | null
  ticket_code: string
  checked_in_at: string | null
  created_at: string
}

export type ClubAttendee = {
  ticket_id: string
  order_id: string
  ticket_type: string | null
  attendee_first_name: string | null
  attendee_last_name: string | null
  attendee_date_of_birth: string | null
  attendee_place_of_birth: string | null
  attendee_tax_code: string | null
  attendee_document: string | null
  fan_card_number: string | null
  ticket_code: string
  checked_in_at: string | null
  buyer_username: string | null
}

export type ClubOrder = {
  order_id: string
  buyer_username: string
  ticket_type: string
  quantity: number
  total_cents: number
  status: string
  channel: 'WEB' | 'BOX_OFFICE'
  created_at: string
}

export type CheckInResult = {
  ticket_id: string
  event_id: string
  attendee_name: string
  checked_in_at: string
  already_checked_in: boolean
}

export type SalesSummary = {
  event_id: string
  event_name: string
  orders: number
  tickets_sold: number
  checked_in: number
  simulated_revenue_cents: number
  unique_buyers: number
}

export type PredictionInsight = {
  match_id: string
  home_team: string
  away_team: string
  market_id: string
  outcome: 'HOME' | 'DRAW' | 'AWAY'
  unique_predictors: number | null
  trades: number | null
  shares: number | null
  last_price: number | null
  suppressed: boolean
}

export type FanCard = {
  card_id: string
  card_number: string
  profile_id: string | null
  username: string | null
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED'
  created_at: string
}

export type Reward = {
  id: string
  club_id: string | null
  club_name?: string
  name: string
  cost_points: number
  discount_percent: number
}

export type AdminClub = {
  club_id: string
  name: string
  slug: string
  plan_code: string | null
  subscription_status: string | null
  created_at: string
}

export type AdminAudit = {
  id: string
  actor_username: string | null
  action: string
  entity_type: string
  entity_id: string | null
  club_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}
