import { useState } from 'react'
import ProgressBar from '../components/ProgressBar'
import Hearts from '../components/Hearts'
import ContentBlock from '../components/ContentBlock'

// Slide-by-slide teaching flow for one lesson. Hearts are shown for visual
// consistency with the Quiz top bar but aren't consumed here — nothing to
// get "wrong" while just reading.
export default function Lesson({ lesson, onClose, onFinish }) {
  const [index, setIndex] = useState(0)

  if (!lesson) return null

  const slide = lesson.slides[index]
  const isLast = index === lesson.slides.length - 1
  const percent = ((index + 1) / lesson.slides.length) * 100

  function handleContinue() {
    if (isLast) {
      onFinish()
    } else {
      setIndex((i) => i + 1)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close lesson"
          className="text-2xl text-muted min-h-[48px] min-w-[48px] flex items-center justify-center -ml-2"
        >
          ✕
        </button>
        <div className="flex-1">
          <ProgressBar percent={percent} />
        </div>
        <Hearts hearts={3} max={3} />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div key={index} className="animate-card-in flex flex-col gap-4">
          <h2 className="text-xl font-black text-ink">{slide.title}</h2>
          {slide.blocks.map((block, i) => (
            <ContentBlock key={i} block={block} />
          ))}
        </div>
      </div>

      <div className="px-6 pb-6 pt-3 safe-bottom">
        <button
          type="button"
          onClick={handleContinue}
          style={{ '--press-color': '#0A5153' }}
          className="btn-chunky w-full bg-teal text-white font-black text-base py-4 rounded-2xl min-h-[48px]"
        >
          {isLast ? 'Start Quiz ⚡' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
