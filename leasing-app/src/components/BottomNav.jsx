const TABS = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'practice', label: 'Practice', icon: '⚡' },
  { key: 'glossary', label: 'Glossary', icon: '📖' },
]

// Fixed bottom tab bar. Only rendered by App.jsx on home/practice/glossary
// screens — hidden during lesson/quiz/complete flow.
export default function BottomNav({ active, onNavigate }) {
  return (
    <nav className="sticky bottom-0 left-0 right-0 bg-surface border-t border-teal-tint safe-bottom">
      <div className="flex justify-around items-stretch">
        {TABS.map((tab) => {
          const isActive = active === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onNavigate(tab.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 min-h-[48px] text-xs font-extrabold transition-colors ${
                isActive ? 'text-teal' : 'text-muted'
              }`}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
