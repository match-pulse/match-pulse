import { redirect } from 'next/navigation'
import LoginForms from '@/components/LoginForms'
import { getCurrentUser } from '@/lib/session'

// The login gate reads cookies and must block; it is not a cacheable page.
export const instant = false

export default async function LoginPage() {
  const user = await getCurrentUser()

  if (user) {
    redirect('/')
  }

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-white">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Match<span className="text-blue-500">Pulse</span>
        </h1>
        <p className="text-slate-400 mt-2">
          Sign in to register, trade and follow the crowd.
        </p>
      </div>

      <LoginForms />

      <p className="mt-8 text-xs text-slate-600 text-center max-w-md">
        This is a course prototype. The database enforces who may act; the
        organizer account is a local development fixture.
      </p>
    </main>
  )
}
