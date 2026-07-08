import ProgressBar from '../components/ProgressBar'

const STATUS_ICON = { done: '✅', available: '▶', locked: '🔒' }

export default function Home({ progress, lessons, isUnlocked, onStartLesson }) {
  const completedCount = progress.completedLessons.length
  const percent = Math.round((completedCount / lessons.length) * 100)

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="px-6 pt-8 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-ink">Corporate Finance</h1>
            <p className="text-muted font-semibold text-sm mt-0.5">
              Master leasing in {lessons.length} lessons
            </p>
          </div>
          <div className="flex items-center gap-1 bg-coral/10 text-coral font-black px-3 py-1.5 rounded-full text-sm shrink-0">
            <span>🔥</span>
            {progress.streak}
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-xs font-bold text-muted mb-1.5">
            <span>Your progress</span>
            <span>{percent}%</span>
          </div>
          <ProgressBar percent={percent} />
        </div>
      </header>

      <main className="px-6 pb-8 flex flex-col gap-3">
        {lessons.map((lesson) => {
          const unlocked = isUnlocked(lesson.id)
          const done = progress.completedLessons.includes(lesson.id)
          const status = done ? 'done' : unlocked ? 'available' : 'locked'

          return (
            <button
              key={lesson.id}
              type="button"
              disabled={!unlocked}
              onClick={() => onStartLesson(lesson.id)}
              className={`btn-chunky flex items-center gap-4 text-left rounded-2xl p-4 border-2 min-h-[48px] ${
                done
                  ? 'bg-teal-tint border-teal'
                  : unlocked
                    ? 'bg-surface border-teal-tint hover:border-teal-light'
                    : 'bg-surface border-teal-tint'
              }`}
              style={{ '--press-color': unlocked ? 'rgba(15,113,115,0.2)' : 'rgba(0,0,0,0.05)' }}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                  done ? 'bg-teal text-white' : unlocked ? 'bg-teal-tint' : 'bg-canvas grayscale opacity-60'
                }`}
              >
                {lesson.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-extrabold truncate ${unlocked ? 'text-ink' : 'text-muted'}`}>
                  {lesson.title}
                </p>
                <p className="text-xs text-muted font-semibold truncate">{lesson.subtitle}</p>
              </div>
              <span className="text-lg shrink-0">{STATUS_ICON[status]}</span>
            </button>
          )
        })}
      </main>
    </div>
  )
}
