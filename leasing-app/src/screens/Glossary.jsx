import { content } from '../data/content'

export default function Glossary({ onResetProgress }) {
  function handleReset() {
    if (window.confirm('Reset all lesson progress, XP, and streak? This cannot be undone.')) {
      onResetProgress()
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="px-6 pt-8 pb-4">
        <h1 className="text-2xl font-black text-ink">Glossary</h1>
        <p className="text-muted font-semibold text-sm mt-0.5">Key leasing terms, in one place</p>
      </header>

      <main className="px-6 pb-8 flex flex-col gap-3">
        {content.glossary.map((entry) => (
          <div key={entry.term} className="bg-surface border-2 border-teal-tint rounded-2xl p-4">
            <p className="font-extrabold text-teal text-[15px] mb-1">{entry.term}</p>
            <p className="text-sm text-ink leading-relaxed">{entry.definition}</p>
          </div>
        ))}

        {/* Small, unobtrusive reset link for testing — not part of the main UX. */}
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-muted/60 font-semibold mt-4 py-2 min-h-[48px] hover:text-muted transition-colors"
        >
          reset progress
        </button>
      </main>
    </div>
  )
}
