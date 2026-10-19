export default function TopBar({ username, points }: { username: string, points: number }) {
  return (
    <header className="w-full bg-slate-950 border-b border-slate-800 p-4 flex justify-between items-center text-white">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold text-xl">
          {username.charAt(0)}
        </div>
        <span className="font-semibold">{username}</span>
      </div>
      <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
        <span className="text-yellow-400 text-lg">🪙</span>
        <span className="font-bold text-yellow-400">{points} PTS</span>
      </div>
    </header>
  )
}