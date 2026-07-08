import { useRef, useState } from 'react'
import ProgressBar from '../components/ProgressBar'
import Hearts from '../components/Hearts'
import OptionButton from '../components/OptionButton'
import renderBold from '../utils/renderBold'

const MAX_HEARTS = 3

// One question at a time: pick → Check → reveal correct/wrong → Next.
// Used for both a single lesson's quiz and the mixed Practice quiz — the
// caller supplies `questions` and the XP to award on completion.
export default function Quiz({ questions, xpReward, onClose, onComplete }) {
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [checked, setChecked] = useState(false)
  const [hearts, setHearts] = useState(MAX_HEARTS)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const startedAt = useRef(Date.now())

  if (!questions || questions.length === 0) return null

  const question = questions[qIndex]
  const isLast = qIndex === questions.length - 1
  const percent = ((qIndex + (checked ? 1 : 0)) / questions.length) * 100
  const isCorrect = selected === question.correctIndex

  function handleSelect(i) {
    if (checked) return
    setSelected(i)
  }

  function handleCheck() {
    if (selected === null) return
    setChecked(true)
    if (isCorrect) {
      setCorrectCount((c) => c + 1)
    } else {
      setWrongCount((c) => c + 1)
      setHearts((h) => Math.max(0, h - 1))
    }
  }

  function handleNext() {
    if (isLast) {
      const timeSeconds = Math.round((Date.now() - startedAt.current) / 1000)
      onComplete({
        xp: xpReward,
        correct: correctCount,
        wrong: wrongCount,
        total: questions.length,
        timeSeconds,
      })
      return
    }
    setQIndex((i) => i + 1)
    setSelected(null)
    setChecked(false)
  }

  function optionState(i) {
    if (!checked) return selected === i ? 'selected' : 'idle'
    if (i === question.correctIndex) return 'correct'
    if (i === selected) return 'wrong'
    return 'faded'
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quiz"
          className="text-2xl text-muted min-h-[48px] min-w-[48px] flex items-center justify-center -ml-2"
        >
          ✕
        </button>
        <div className="flex-1">
          <ProgressBar percent={percent} color="coral" />
        </div>
        <Hearts hearts={hearts} max={MAX_HEARTS} />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div key={qIndex} className="animate-card-in flex flex-col gap-5">
          <h2 className="text-lg font-black text-ink leading-snug">{question.question}</h2>

          <div className="flex flex-col gap-3">
            {question.options.map((opt, i) => (
              <OptionButton
                key={i}
                label={opt}
                state={optionState(i)}
                disabled={checked}
                onClick={() => handleSelect(i)}
              />
            ))}
          </div>

          {checked && (
            <div
              className={`animate-card-in rounded-2xl p-4 border-2 ${
                isCorrect ? 'bg-correct/10 border-correct/40' : 'bg-wrong/10 border-wrong/40'
              }`}
            >
              <p className={`font-black text-sm mb-1 ${isCorrect ? 'text-correct' : 'text-wrong'}`}>
                {isCorrect ? 'Correct! ✓' : 'Not quite ✕'}
              </p>
              <p className="text-sm text-ink leading-relaxed">{renderBold(question.explanation)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pb-6 pt-3 safe-bottom">
        {!checked ? (
          <button
            type="button"
            onClick={handleCheck}
            disabled={selected === null}
            style={{ '--press-color': '#0A5153' }}
            className="btn-chunky w-full bg-teal text-white font-black text-base py-4 rounded-2xl min-h-[48px]"
          >
            Check
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            style={{ '--press-color': '#C24E12' }}
            className="btn-chunky w-full bg-coral text-white font-black text-base py-4 rounded-2xl min-h-[48px]"
          >
            {isLast ? 'Finish 🎉' : 'Next →'}
          </button>
        )}
      </div>
    </div>
  )
}
