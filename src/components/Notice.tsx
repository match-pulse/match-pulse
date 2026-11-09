export default function Notice({
  message,
  error
}: {
  message?: string
  error?: string
}) {
  if (!message && !error) return null

  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`mb-5 rounded border px-3 py-2 text-sm ${
        error
          ? 'border-red-800 bg-red-950/50 text-red-200'
          : 'border-emerald-800 bg-emerald-950/50 text-emerald-200'
      }`}
    >
      {error ?? message}
    </div>
  )
}
