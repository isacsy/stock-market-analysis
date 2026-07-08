import { useMemo } from 'react'
import Quiz from './Quiz'

// Pulls a random 8-question mix from every lesson's quiz and reuses the
// same Quiz UI. Re-shuffles each time the screen mounts (i.e. each time the
// learner taps the ⚡ Practice tab).
export default function Practice({ lessons, onClose, onComplete }) {
  const questions = useMemo(() => {
    const pool = lessons.flatMap((lesson) =>
      lesson.quiz.map((q) => ({ ...q, lessonTitle: lesson.title })),
    )
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(8, shuffled.length))
  }, [lessons])

  return (
    <Quiz
      questions={questions}
      xpReward={questions.length * 2}
      onClose={onClose}
      onComplete={onComplete}
    />
  )
}
