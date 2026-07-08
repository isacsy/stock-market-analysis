// Thin fill bar used both for lesson/quiz slide progress and Home's
// overall-completion bar. `percent` is 0-100.
export default function ProgressBar({ percent, color = 'teal' }) {
  const clamped = Math.max(0, Math.min(100, percent))
  const barColor = color === 'coral' ? 'bg-coral' : 'bg-teal'

  return (
    <div className="w-full h-3 rounded-full bg-teal-tint overflow-hidden">
      <div
        className={`h-full rounded-full ${barColor} transition-all duration-500 ease-out`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
