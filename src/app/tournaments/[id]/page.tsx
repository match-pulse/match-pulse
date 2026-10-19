import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import RegistrationForm from '@/components/RegistrationForm'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/session'

async function TournamentContent({ params }: { params: Promise<{ id: string }> }) {
  // Awaiting the route params inside the Suspense boundary keeps the dynamic
  // access from blocking prerendering, which `cacheComponents` requires.
  const { id: tournamentId } = await params
  const userId = await getCurrentUserId()

  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .maybeSingle()

  if (tournamentError) {
    throw new Error(`Failed to load tournament: ${tournamentError.message}`)
  }

  if (!tournament) {
    notFound()
  }

  const { data: registration, error: registrationError } = await supabase
    .from('registrations')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .maybeSingle()

  if (registrationError) {
    throw new Error(`Failed to load registration: ${registrationError.message}`)
  }

  const isRegistered = registration !== null
  const isFull = tournament.current_players >= tournament.max_capacity
  const placesLeft = Math.max(0, tournament.max_capacity - tournament.current_players)

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col">
      <header className="w-full bg-slate-950 border-b border-slate-800 p-4 text-white">
        <span className="font-semibold">
          Match<span className="text-blue-500">Pulse</span>
        </span>
      </header>

      <div className="flex-1 flex flex-col items-center justify-start p-8 gap-8">
        <div className="text-center">
          <h1 className="text-4xl text-white font-extrabold mb-2 tracking-tight">
            {tournament.name}
          </h1>
          <p className="text-slate-400 font-medium text-lg">
            {placesLeft > 0
              ? `${placesLeft} of ${tournament.max_capacity} places left`
              : `Full — all ${tournament.max_capacity} places taken`}
          </p>
        </div>

        <RegistrationForm
          tournamentId={tournamentId}
          isRegistered={isRegistered}
          isFull={isFull}
        />

        <a href="/predict" className="text-slate-400 hover:text-white text-sm underline">
          Back to predictions
        </a>
      </div>
    </main>
  )
}

export default function TournamentPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<p className="text-center text-white mt-10">Loading tournament...</p>}>
      <TournamentContent params={params} />
    </Suspense>
  )
}