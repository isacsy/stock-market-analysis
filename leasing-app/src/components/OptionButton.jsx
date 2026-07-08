// A big tap-friendly quiz option button. `state` drives the visual variant:
//  - 'idle'      : not selected, not checked yet
//  - 'selected'  : tapped, awaiting Check
//  - 'correct'   : revealed as the right answer
//  - 'wrong'     : revealed as the picked-but-wrong answer
//  - 'faded'     : an unpicked, non-correct option after Check
export default function OptionButton({ label, state, onClick, disabled }) {
  const base =
    'w-full min-h-[48px] text-left px-5 py-4 rounded-2xl font-bold text-[15px] border-2 transition-colors duration-150 btn-chunky'

  const variants = {
    idle: 'bg-surface border-teal-tint text-ink hover:border-teal-light',
    selected: 'bg-teal-tint border-teal text-teal',
    correct: 'bg-correct/10 border-correct text-correct',
    wrong: 'bg-wrong/10 border-wrong text-wrong',
    faded: 'bg-surface border-teal-tint text-muted opacity-40',
  }

  const pressColor = {
    idle: 'rgba(26,26,46,0.08)',
    selected: 'rgba(15,113,115,0.25)',
    correct: 'rgba(46,204,113,0.3)',
    wrong: 'rgba(229,57,53,0.3)',
    faded: 'transparent',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ '--press-color': pressColor[state] }}
      className={`${base} ${variants[state] ?? variants.idle}`}
    >
      {label}
    </button>
  )
}
