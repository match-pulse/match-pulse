#!/usr/bin/env bun
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { parseArgs, getBoolean, getList, getNumber, getString } from './args'
import { getClient, login, logout, signup, sessionSummary } from './session'
import { describeCommand, failure, helpText, success, unknownCommand, type CommandInfo } from './output'
import { DomainError } from '@/lib/domain/errors'
import { getIdentity } from '@/lib/domain/auth'
import {
  acceptClubInvite,
  createClub,
  getClubContext,
  inviteClubMember,
  listClubMembers,
  listMyClubs,
  listPlans,
  removeClubMember,
  requestPlanChange,
  setClubMemberRole,
  updateClub
} from '@/lib/domain/clubs'
import {
  createClubEvent,
  createClubMatch,
  createTicketType,
  getPublicEvent,
  listClubEvents,
  listClubMatches,
  listClubTicketTypes,
  listPublicEvents,
  publishClubEvent,
  resolveMarket,
  setPredictionEnabled,
  updateClubEvent,
  updateClubMatch
} from '@/lib/domain/events'
import {
  boxOfficeSell,
  checkInTicket,
  issueFanCard,
  listClubAttendees,
  listClubOrders,
  listFanCards,
  listMyTickets,
  purchaseTickets,
  transferTicket
} from '@/lib/domain/tickets'
import {
  createClubReward,
  listClubRewards,
  listFanRewards,
  predictionInsights,
  predictionTimeseries,
  recordClubExport,
  redeemReward,
  salesSummary
} from '@/lib/domain/analytics'
import { enterPosition, exitPosition, myPortfolio } from '@/lib/domain/predictions'
import { adminAssignPlan, adminListAudit, adminListClubs, adminSetSubscriptionStatus } from '@/lib/domain/admin'
import { selectRows } from '@/lib/domain/rpc'
import type { AttendeeInput } from '@/lib/domain/types'

const COMMANDS: CommandInfo[] = [
  { command: 'auth signup', group: 'auth', description: 'Create an email/password account', usage: '--email <email> --password <password> [--username <name>]', mutates: true },
  { command: 'auth login', group: 'auth', description: 'Sign in and store a profile session', usage: '--email <email> --password <password>', mutates: false },
  { command: 'auth logout', group: 'auth', description: 'Sign out and delete the profile session', usage: '', mutates: false },
  { command: 'auth whoami', group: 'auth', description: 'Show the user, clubs and admin flag', usage: '', mutates: false },
  { command: 'plans list', group: 'discovery', description: 'List plans and their entitlements', usage: '--json', mutates: false },
  { command: 'commands', group: 'discovery', description: 'List machine-readable commands', usage: '--json', mutates: false },

  { command: 'fan events list', group: 'fan', description: 'List published events', usage: '--json', mutates: false },
  { command: 'fan events show', group: 'fan', description: 'Show an event, ticket types and matches', usage: '--event <id>', mutates: false },
  { command: 'fan tickets buy', group: 'fan', description: 'Buy one to four nominal tickets', usage: '--ticket-type <id> --attendee <json> [--attendee <json>] --accept-terms', mutates: true },
  { command: 'fan tickets list', group: 'fan', description: 'List the buyer tickets', usage: '', mutates: false },
  { command: 'fan tickets show', group: 'fan', description: 'Show one ticket and its code', usage: '--ticket <id>', mutates: false },
  { command: 'fan tickets transfer', group: 'fan', description: 'Change the named attendee before the deadline', usage: '--ticket <id> --attendee <json>', mutates: true },
  { command: 'fan predictions enter', group: 'fan', description: 'Enter a points-only prediction position', usage: '--market <id> --outcome HOME|DRAW|AWAY --budget <points> [--request-id]', mutates: true },
  { command: 'fan predictions exit', group: 'fan', description: 'Exit part or all of a position', usage: '--market <id> --outcome HOME|DRAW|AWAY --shares <number> [--request-id]', mutates: true },
  { command: 'fan portfolio', group: 'fan', description: 'Show positions, trades and payouts', usage: '', mutates: false },
  { command: 'fan portfolio show', group: 'fan', description: 'Show positions, trades and payouts', usage: '', mutates: false },
  { command: 'fan rewards list', group: 'fan', description: 'List active club rewards', usage: '', mutates: false },
  { command: 'fan rewards redeem', group: 'fan', description: 'Redeem points for a club reward', usage: '--reward <id> [--request-id]', mutates: true },

  { command: 'club create', group: 'club', description: 'Create a club and become its owner', usage: '--name <name> [--plan STARTER|PRO|ELITE] [--slug]', mutates: true },
  { command: 'club list', group: 'club', description: 'List the memberships of the current user', usage: '', mutates: false },
  { command: 'club show', group: 'club', description: 'Show a club context, plan and entitlements', usage: '--club <id>', mutates: false },
  { command: 'club update', group: 'club', description: 'Update the club name or slug', usage: '--club <id> --name <name> [--slug]', mutates: true },
  { command: 'club plan request', group: 'club', description: 'Request a plan change', usage: '--club <id> --plan STARTER|PRO|ELITE', mutates: true },
  { command: 'club plan show', group: 'club', description: 'Show the current plan and entitlements', usage: '--club <id>', mutates: false },
  { command: 'club members invite', group: 'club', description: 'Invite a member by email', usage: '--club <id> --email <email> --role ADMIN|STAFF|ANALYST', mutates: true },
  { command: 'club members accept', group: 'club', description: 'Accept an invitation token', usage: '--token <token>', mutates: true },
  { command: 'club members list', group: 'club', description: 'List club members', usage: '--club <id>', mutates: false },
  { command: 'club members role', group: 'club', description: 'Change a member role', usage: '--club <id> --profile <id> --role ADMIN|STAFF|ANALYST', mutates: true },
  { command: 'club members remove', group: 'club', description: 'Remove a member', usage: '--club <id> --profile <id>', mutates: true },
  { command: 'club events create', group: 'club', description: 'Create a draft event', usage: '--club <id> --name <name> --capacity <n> [--allocation <n>] [--points <n>]', mutates: true },
  { command: 'club events list', group: 'club', description: 'List club events', usage: '--club <id>', mutates: false },
  { command: 'club events update', group: 'club', description: 'Update an event', usage: '--event <id> --name <name> --capacity <n> --allocation <n> --points <n>', mutates: true },
  { command: 'club events publish', group: 'club', description: 'Publish an event with an active ticket type', usage: '--event <id>', mutates: true },
  { command: 'club matches create', group: 'club', description: 'Create a match and optionally its market', usage: '--event <id> --home <team> --away <team> --kickoff <iso> [--predictions]', mutates: true },
  { command: 'club matches list', group: 'club', description: 'List matches and markets for an event', usage: '--event <id>', mutates: false },
  { command: 'club matches update', group: 'club', description: 'Update a match score and status', usage: '--match <id> --home-score <n> --away-score <n> --status SCHEDULED|LIVE|FINISHED', mutates: true },
  { command: 'club predictions enable', group: 'club', description: 'Enable or disable predictions for a match', usage: '--match <id> [--disable]', mutates: true },
  { command: 'club predictions resolve', group: 'club', description: 'Resolve a market and settle positions', usage: '--market <id> --winner HOME|DRAW|AWAY', mutates: true },
  { command: 'club ticket-types create', group: 'club', description: 'Create a nominal ticket type', usage: '--event <id> --name <name> [--price-cents] [--allocation] [--max-per-buyer] [--requires-fan-card] [--non-transferable] [--away-sector]', mutates: true },
  { command: 'club ticket-types list', group: 'club', description: 'List ticket types for an event', usage: '--event <id>', mutates: false },
  { command: 'club orders list', group: 'club', description: 'List orders for an event', usage: '--event <id>', mutates: false },
  { command: 'club attendees list', group: 'club', description: 'List named attendees for an event', usage: '--event <id>', mutates: false },
  { command: 'club tickets check-in', group: 'club', description: 'Check in a ticket by code', usage: '--code <ticket-code>', mutates: true },
  { command: 'club box-office sell', group: 'club', description: 'Sell tickets through the box office', usage: '--ticket-type <id> --buyer <profile-id> --attendee <json> --accept-terms', mutates: true },
  { command: 'club fan-cards issue', group: 'club', description: 'Issue or reactivate a fan card', usage: '--club <id> --card <number> [--profile <id>]', mutates: true },
  { command: 'club fan-cards list', group: 'club', description: 'List club fan cards', usage: '--club <id>', mutates: false },
  { command: 'club analytics summary', group: 'club', description: 'Show sales and attendance aggregates', usage: '--club <id> [--event <id>]', mutates: false },
  { command: 'club analytics predictions', group: 'club', description: 'Show aggregate prediction insights', usage: '--club <id> [--event <id>] [--match <id>]', mutates: false },
  { command: 'club analytics timeseries', group: 'club', description: 'Show prediction time series (ELITE)', usage: '--club <id> --market <id> [--bucket <minutes>]', mutates: false },
  { command: 'club analytics export', group: 'club', description: 'Record an authorised analytics export', usage: '--club <id> --resource <name> [--metadata <json>]', mutates: true },
  { command: 'club rewards create', group: 'club', description: 'Create a club reward (PRO/ELITE)', usage: '--club <id> --name <name> --cost <points> --discount <percent>', mutates: true },
  { command: 'club rewards list', group: 'club', description: 'List club rewards', usage: '--club <id>', mutates: false },

  { command: 'admin clubs list', group: 'admin', description: 'List all clubs and subscriptions', usage: '', mutates: false },
  { command: 'admin plans assign', group: 'admin', description: 'Assign a plan and subscription status', usage: '--club <id> --plan STARTER|PRO|ELITE [--status ACTIVE|PAST_DUE|CANCELED]', mutates: true },
  { command: 'admin subscription status', group: 'admin', description: 'Set a subscription status', usage: '--club <id> --status ACTIVE|PAST_DUE|CANCELED', mutates: true },
  { command: 'admin audit list', group: 'admin', description: 'List recent audit events', usage: '[--limit <n>]', mutates: false },
  { command: 'ops health', group: 'ops', description: 'Check the database boundary', usage: '', mutates: false }
]

function required(flags: Record<string, string | boolean | string[]>, key: string): string {
  const value = getString(flags, key)
  if (value === undefined || value.trim() === '') {
    throw new DomainError('VALIDATION', `--${key} is required.`)
  }
  return value
}

function requiredNumber(
  flags: Record<string, string | boolean | string[]>,
  key: string
): number {
  const value = getNumber(flags, key)
  if (value === undefined) {
    throw new DomainError('VALIDATION', `--${key} must be a number.`)
  }
  return value
}

function optionalNumber(
  flags: Record<string, string | boolean | string[]>,
  key: string
): number | undefined {
  const raw = getString(flags, key)
  if (raw === undefined) return undefined
  const value = Number(raw)
  if (!Number.isFinite(value)) {
    throw new DomainError('VALIDATION', `--${key} must be a number.`)
  }
  return value
}

function requiredOutcome(
  flags: Record<string, string | boolean | string[]>
): 'HOME' | 'DRAW' | 'AWAY' {
  const value = required(flags, 'outcome').toUpperCase()
  if (value !== 'HOME' && value !== 'DRAW' && value !== 'AWAY') {
    throw new DomainError('VALIDATION', '--outcome must be HOME, DRAW or AWAY.')
  }
  return value
}

function requestId(flags: Record<string, string | boolean | string[]>): string {
  return getString(flags, 'request-id') ?? randomUUID()
}

function parseAttendee(raw: string): AttendeeInput {
  try {
    const parsed = JSON.parse(raw) as AttendeeInput
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not an object')
    }
    return parsed
  } catch {
    throw new DomainError('VALIDATION', '--attendee must be a JSON object.')
  }
}

function attendeesFrom(flags: Record<string, string | boolean | string[]>): AttendeeInput[] {
  const file = getString(flags, 'attendees-file')
  if (file) {
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as AttendeeInput[]
      if (!Array.isArray(parsed)) throw new Error('not an array')
      return parsed
    } catch {
      throw new DomainError('VALIDATION', '--attendees-file must contain a JSON array.')
    }
  }

  const raw = getList(flags, 'attendee')
  if (raw.length === 0) {
    throw new DomainError(
      'VALIDATION',
      'Pass at least one --attendee <json> or --attendees-file <path>.'
    )
  }
  return raw.map(parseAttendee)
}

function parseMetadata(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not an object')
    }
    return parsed
  } catch {
    throw new DomainError('VALIDATION', '--metadata must be a JSON object.')
  }
}

async function dispatch(
  command: string,
  flags: Record<string, string | boolean | string[]>,
  profile: string
): Promise<unknown> {
  switch (command) {
    case 'auth signup': {
      const session = await signup(
        profile,
        required(flags, 'email'),
        required(flags, 'password'),
        getString(flags, 'username')
      )
      return sessionSummary(session)
    }
    case 'auth login': {
      const session = await login(
        profile,
        required(flags, 'email'),
        required(flags, 'password')
      )
      return sessionSummary(session)
    }
    case 'auth logout':
      await logout(profile)
      return { profile, loggedOut: true }
    case 'auth whoami': {
      const client = await getClient(profile)
      return getIdentity(client)
    }

    case 'fan events list': {
      const client = await getClient(profile)
      return listPublicEvents(client)
    }
    case 'fan events show': {
      const client = await getClient(profile)
      return getPublicEvent(client, required(flags, 'event'))
    }
    case 'fan tickets buy': {
      const client = await getClient(profile)
      return purchaseTickets(
        client,
        required(flags, 'ticket-type'),
        attendeesFrom(flags),
        requestId(flags),
        { acceptTerms: getBoolean(flags, 'accept-terms') || getBoolean(flags, 'terms') }
      )
    }
    case 'fan tickets list': {
      const client = await getClient(profile)
      return listMyTickets(client)
    }
    case 'fan tickets show': {
      const client = await getClient(profile)
      const tickets = await listMyTickets(client)
      const ticket = tickets.find((row) => row.ticket_id === required(flags, 'ticket'))
      if (!ticket) throw new DomainError('NOT_FOUND', 'Ticket not found for this profile.')
      return ticket
    }
    case 'fan tickets transfer': {
      const client = await getClient(profile)
      const attendees = attendeesFrom(flags)
      if (attendees.length !== 1) {
        throw new DomainError('VALIDATION', 'A transfer requires exactly one --attendee.')
      }
      await transferTicket(client, required(flags, 'ticket'), attendees[0])
      return { done: true }
    }
    case 'fan predictions enter': {
      const client = await getClient(profile)
      return enterPosition(
        client,
        required(flags, 'market'),
        requiredOutcome(flags),
        requiredNumber(flags, 'budget'),
        requestId(flags)
      )
    }
    case 'fan predictions exit': {
      const client = await getClient(profile)
      return exitPosition(
        client,
        required(flags, 'market'),
        requiredOutcome(flags),
        required(flags, 'shares'),
        requestId(flags)
      )
    }
    case 'fan portfolio':
    case 'fan portfolio show': {
      const client = await getClient(profile)
      return myPortfolio(client)
    }
    case 'fan rewards list': {
      const client = await getClient(profile)
      return listFanRewards(client)
    }
    case 'fan rewards redeem': {
      const client = await getClient(profile)
      return redeemReward(client, required(flags, 'reward'), requestId(flags))
    }

    case 'club create': {
      const client = await getClient(profile)
      const clubId = await createClub(
        client,
        required(flags, 'name'),
        (getString(flags, 'plan') ?? 'STARTER').toUpperCase(),
        getString(flags, 'slug')
      )
      return { clubId }
    }
    case 'club list':
    case 'club show':
    case 'club plan show': {
      const client = await getClient(profile)
      if (command === 'club list') return listMyClubs(client)
      return getClubContext(client, required(flags, 'club'))
    }
    case 'club update': {
      const client = await getClient(profile)
      await updateClub(client, required(flags, 'club'), required(flags, 'name'), getString(flags, 'slug'))
      return { done: true }
    }
    case 'club plan request': {
      const client = await getClient(profile)
      const planRequestId = await requestPlanChange(
        client,
        required(flags, 'club'),
        required(flags, 'plan').toUpperCase()
      )
      return { requestId: planRequestId }
    }
    case 'club members invite': {
      const client = await getClient(profile)
      return inviteClubMember(
        client,
        required(flags, 'club'),
        required(flags, 'email'),
        required(flags, 'role').toUpperCase()
      )
    }
    case 'club members accept': {
      const client = await getClient(profile)
      return { clubId: await acceptClubInvite(client, required(flags, 'token')) }
    }
    case 'club members list': {
      const client = await getClient(profile)
      return listClubMembers(client, required(flags, 'club'))
    }
    case 'club members role': {
      const client = await getClient(profile)
      await setClubMemberRole(
        client,
        required(flags, 'club'),
        required(flags, 'profile'),
        required(flags, 'role').toUpperCase()
      )
      return { done: true }
    }
    case 'club members remove': {
      const client = await getClient(profile)
      await removeClubMember(
        client,
        required(flags, 'club'),
        required(flags, 'profile')
      )
      return { done: true }
    }
    case 'club events create': {
      const client = await getClient(profile)
      const capacity = requiredNumber(flags, 'capacity')
      const eventId = await createClubEvent(
        client,
        required(flags, 'club'),
        required(flags, 'name'),
        capacity,
        optionalNumber(flags, 'allocation') ?? capacity,
        optionalNumber(flags, 'points') ?? 0
      )
      return { eventId }
    }
    case 'club events list': {
      const client = await getClient(profile)
      return listClubEvents(client, required(flags, 'club'))
    }
    case 'club events update': {
      const client = await getClient(profile)
      await updateClubEvent(
        client,
        required(flags, 'event'),
        required(flags, 'name'),
        requiredNumber(flags, 'capacity'),
        requiredNumber(flags, 'allocation'),
        requiredNumber(flags, 'points')
      )
      return { done: true }
    }
    case 'club events publish': {
      const client = await getClient(profile)
      await publishClubEvent(client, required(flags, 'event'))
      return { done: true }
    }
    case 'club matches create': {
      const client = await getClient(profile)
      return createClubMatch(
        client,
        required(flags, 'event'),
        required(flags, 'home'),
        required(flags, 'away'),
        required(flags, 'kickoff'),
        getBoolean(flags, 'predictions')
      )
    }
    case 'club matches list': {
      const client = await getClient(profile)
      return listClubMatches(client, required(flags, 'event'))
    }
    case 'club matches update': {
      const client = await getClient(profile)
      const status = required(flags, 'status').toUpperCase()
      if (status !== 'SCHEDULED' && status !== 'LIVE' && status !== 'FINISHED') {
        throw new DomainError('VALIDATION', '--status must be SCHEDULED, LIVE or FINISHED.')
      }
      await updateClubMatch(
        client,
        required(flags, 'match'),
        requiredNumber(flags, 'home-score'),
        requiredNumber(flags, 'away-score'),
        status
      )
      return { done: true }
    }
    case 'club predictions enable': {
      const client = await getClient(profile)
      await setPredictionEnabled(
        client,
        required(flags, 'match'),
        !getBoolean(flags, 'disable')
      )
      return { done: true }
    }
    case 'club predictions resolve': {
      const client = await getClient(profile)
      const winner = required(flags, 'winner').toUpperCase()
      if (winner !== 'HOME' && winner !== 'DRAW' && winner !== 'AWAY') {
        throw new DomainError('VALIDATION', '--winner must be HOME, DRAW or AWAY.')
      }
      return resolveMarket(client, required(flags, 'market'), winner)
    }
    case 'club ticket-types create': {
      const client = await getClient(profile)
      const ticketTypeId = await createTicketType(client, {
        eventId: required(flags, 'event'),
        name: required(flags, 'name'),
        sector: getString(flags, 'sector'),
        priceCents: optionalNumber(flags, 'price-cents'),
        allocation: optionalNumber(flags, 'allocation'),
        salesStart: getString(flags, 'sales-start') ?? null,
        salesEnd: getString(flags, 'sales-end') ?? null,
        transferDeadline: getString(flags, 'transfer-deadline') ?? null,
        maxPerBuyer: optionalNumber(flags, 'max-per-buyer'),
        requiresFanCard: getBoolean(flags, 'requires-fan-card'),
        transferable: !getBoolean(flags, 'non-transferable'),
        awaySector: getBoolean(flags, 'away-sector')
      })
      return { ticketTypeId }
    }
    case 'club ticket-types list': {
      const client = await getClient(profile)
      return listClubTicketTypes(client, required(flags, 'event'))
    }
    case 'club orders list': {
      const client = await getClient(profile)
      return listClubOrders(client, required(flags, 'event'))
    }
    case 'club attendees list': {
      const client = await getClient(profile)
      return listClubAttendees(client, required(flags, 'event'))
    }
    case 'club tickets check-in': {
      const client = await getClient(profile)
      return checkInTicket(client, required(flags, 'code'))
    }
    case 'club box-office sell': {
      const client = await getClient(profile)
      return boxOfficeSell(
        client,
        required(flags, 'ticket-type'),
        required(flags, 'buyer'),
        attendeesFrom(flags),
        requestId(flags),
        getBoolean(flags, 'accept-terms') || getBoolean(flags, 'terms')
      )
    }
    case 'club fan-cards issue': {
      const client = await getClient(profile)
      const cardId = await issueFanCard(
        client,
        required(flags, 'club'),
        required(flags, 'card'),
        getString(flags, 'profile')
      )
      return { cardId }
    }
    case 'club fan-cards list': {
      const client = await getClient(profile)
      return listFanCards(client, required(flags, 'club'))
    }
    case 'club analytics summary': {
      const client = await getClient(profile)
      return salesSummary(client, required(flags, 'club'), getString(flags, 'event'))
    }
    case 'club analytics predictions': {
      const client = await getClient(profile)
      return predictionInsights(
        client,
        required(flags, 'club'),
        getString(flags, 'event'),
        getString(flags, 'match')
      )
    }
    case 'club analytics timeseries': {
      const client = await getClient(profile)
      return predictionTimeseries(
        client,
        required(flags, 'club'),
        required(flags, 'market'),
        optionalNumber(flags, 'bucket') ?? 5
      )
    }
    case 'club analytics export': {
      const client = await getClient(profile)
      await recordClubExport(
        client,
        required(flags, 'club'),
        required(flags, 'resource'),
        parseMetadata(getString(flags, 'metadata'))
      )
      return { done: true }
    }
    case 'club rewards create': {
      const client = await getClient(profile)
      const rewardId = await createClubReward(
        client,
        required(flags, 'club'),
        required(flags, 'name'),
        requiredNumber(flags, 'cost'),
        requiredNumber(flags, 'discount')
      )
      return { rewardId }
    }
    case 'club rewards list': {
      const client = await getClient(profile)
      return listClubRewards(client, required(flags, 'club'))
    }

    case 'admin clubs list': {
      const client = await getClient(profile)
      return adminListClubs(client)
    }
    case 'admin plans assign': {
      const client = await getClient(profile)
      const status = (getString(flags, 'status') ?? 'ACTIVE').toUpperCase()
      if (status !== 'ACTIVE' && status !== 'PAST_DUE' && status !== 'CANCELED') {
        throw new DomainError('VALIDATION', '--status must be ACTIVE, PAST_DUE or CANCELED.')
      }
      await adminAssignPlan(client, required(flags, 'club'), required(flags, 'plan').toUpperCase(), status)
      return { done: true }
    }
    case 'admin subscription status': {
      const client = await getClient(profile)
      const status = required(flags, 'status').toUpperCase()
      if (status !== 'ACTIVE' && status !== 'PAST_DUE' && status !== 'CANCELED') {
        throw new DomainError('VALIDATION', '--status must be ACTIVE, PAST_DUE or CANCELED.')
      }
      await adminSetSubscriptionStatus(client, required(flags, 'club'), status)
      return { done: true }
    }
    case 'admin audit list': {
      const client = await getClient(profile)
      return adminListAudit(client, optionalNumber(flags, 'limit') ?? 100)
    }

    case 'ops health': {
      const client = await getClient(profile)
      const plans = await selectRows<{ code: string }>(
        client.from('plans').select('code').limit(1)
      )
      return { app: 'up', db: 'up', plans: plans.length }
    }

    case 'plans list': {
      const client = await getClient(profile)
      return listPlans(client)
    }

    default:
      throw unknownCommand(command)
  }
}

async function main(): Promise<void> {
  const { positionals, flags } = parseArgs(process.argv.slice(2))
  const json = getBoolean(flags, 'json')
  const profile = getString(flags, 'profile') ?? 'default'

  if (getBoolean(flags, 'help') || positionals.length === 0) {
    console.log(helpText(COMMANDS))
    return
  }

  if (positionals[0] === 'commands') {
    success(COMMANDS, json)
    return
  }

  if (positionals[0] === 'help') {
    console.log(helpText(COMMANDS))
    return
  }

  if (positionals[0] === 'describe') {
    const target = positionals.slice(1).join(' ')
    const command = describeCommand(COMMANDS, target)
    if (!command) {
      failure(unknownCommand(target), json)
      return
    }
    success(command, json)
    return
  }

  const command = positionals.join(' ')

  try {
    const data = await dispatch(command, flags, profile)
    success(data, json)
  } catch (error) {
    failure(error, json)
  }
}

await main()
