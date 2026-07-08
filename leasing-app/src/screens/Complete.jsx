// Results screen shown after finishing a lesson quiz OR a practice session
// (mode differentiates the headline copy only — the stat cards are shared).
export default function Complete({ result, mode, onContinue }) {
  if (!result) return null

  const accuracy = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0
  const isPerfect = accuracy === 100

  const heading = isPerfect
    ? 'Perfect! 🌟'
    : mode === 'practice'
      ? 'Practice Complete!'
      : 'Lesson Complete!'

  const emoji = isPerfect ? '🏆' : mode === 'practice' ? '⚡' : '🎉'

  const stats = [
    { label: 'XP earned', value: `+${result.xp}`, color: 'text-gold' },
    { label: 'Accuracy', value: `${accuracy}%`, color: 'text-correct' },
    { label: 'Time', value: `${result.timeSeconds}s`, color: 'text-teal' },
  ]

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 text-center gap-6">
      <div className="text-6xl animate-pop-in">{emoji}</div>
      <h1 className="text-2xl font-black text-ink">{heading}</h1>

      <div className="w-full grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface border-2 border-teal-tint rounded-2xl py-4 px-2 flex flex-col items-center gap-1"
          >
            <span className={`text-xl font-black ${stat.color}`}>{stat.value}</span>
            <span className="text-[11px] font-bold text-muted uppercase tracking-wide">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onContinue}
        style={{ '--press-color': '#0A5153' }}
        className="btn-chunky w-full bg-teal text-white font-black text-base py-4 rounded-2xl min-h-[48px] mt-2"
      >
        Continue →
      </button>
    </div>
  )
}
