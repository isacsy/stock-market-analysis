import { useEffect, useState } from 'react'
import { content } from './data/content'
import BottomNav from './components/BottomNav'
import Home from './screens/Home'
import Lesson from './screens/Lesson'
import Quiz from './screens/Quiz'
import Practice from './screens/Practice'
import Complete from './screens/Complete'
import Glossary from './screens/Glossary'

const STORAGE_KEY = 'leasing-app-progress'

const DEFAULT_PROGRESS = {
  completedLessons: [],
  xp: 0,
  streak: 0,
  lastActiveDate: null,
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PROGRESS
    return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PROGRESS
  }
}

// Bumps streak once per calendar day. Same day → no change. The day right
// after the last active day → +1. Anything else (first ever, or a gap) → 1.
function nextStreak(progress) {
  const today = new Date().toDateString()
  if (progress.lastActiveDate === today) return progress.streak
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  return progress.lastActiveDate === yesterday ? progress.streak + 1 : 1
}

// Screens that show the bottom tab bar. Lesson/quiz/complete flows hide it
// so the learner stays focused.
const NAV_SCREENS = new Set(['home', 'glossary'])

export default function App() {
  const [progress, setProgress] = useState(loadProgress)
  const [screen, setScreen] = useState('home')
  const [activeLessonId, setActiveLessonId] = useState(null)
  const [lastResult, setLastResult] = useState(null)
  const [resultMode, setResultMode] = useState('lesson') // 'lesson' | 'practice'

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }, [progress])

  const activeLesson = content.lessons.find((l) => l.id === activeLessonId) ?? null

  function isUnlocked(lessonId) {
    if (lessonId === content.lessons[0].id) return true
    const idx = content.lessons.findIndex((l) => l.id === lessonId)
    const prevLesson = content.lessons[idx - 1]
    return prevLesson ? progress.completedLessons.includes(prevLesson.id) : false
  }

  function handleStartLesson(lessonId) {
    if (!isUnlocked(lessonId)) return
    setActiveLessonId(lessonId)
    setScreen('lesson')
  }

  function handleFinishTeaching() {
    setScreen('quiz')
  }

  function handleLessonQuizDone(result) {
    setResultMode('lesson')
    setLastResult(result)

    setProgress((prev) => {
      const alreadyDone = prev.completedLessons.includes(activeLessonId)
      const completedLessons = alreadyDone
        ? prev.completedLessons
        : [...prev.completedLessons, activeLessonId]
      return {
        ...prev,
        completedLessons,
        xp: prev.xp + result.xp,
        streak: nextStreak(prev),
        lastActiveDate: new Date().toDateString(),
      }
    })

    setScreen('complete')
  }

  function handlePracticeQuizDone(result) {
    setResultMode('practice')
    setLastResult(result)
    setProgress((prev) => ({
      ...prev,
      xp: prev.xp + result.xp,
      streak: nextStreak(prev),
      lastActiveDate: new Date().toDateString(),
    }))
    setScreen('complete')
  }

  function handleContinueFromComplete() {
    setActiveLessonId(null)
    setScreen('home')
  }

  function handleCloseFlow() {
    setActiveLessonId(null)
    setScreen('home')
  }

  function handleResetProgress() {
    setProgress(DEFAULT_PROGRESS)
    setScreen('home')
  }

  function renderScreen() {
    switch (screen) {
      case 'lesson':
        return (
          <Lesson
            lesson={activeLesson}
            onClose={handleCloseFlow}
            onFinish={handleFinishTeaching}
          />
        )
      case 'quiz':
        return (
          <Quiz
            questions={activeLesson.quiz}
            xpReward={activeLesson.xp}
            onClose={handleCloseFlow}
            onComplete={handleLessonQuizDone}
          />
        )
      case 'practiceQuiz':
        return (
          <Practice
            lessons={content.lessons}
            onClose={handleCloseFlow}
            onComplete={handlePracticeQuizDone}
          />
        )
      case 'complete':
        return (
          <Complete
            result={lastResult}
            mode={resultMode}
            onContinue={handleContinueFromComplete}
          />
        )
      case 'glossary':
        return <Glossary onResetProgress={handleResetProgress} />
      case 'home':
      default:
        return (
          <Home
            progress={progress}
            lessons={content.lessons}
            isUnlocked={isUnlocked}
            onStartLesson={handleStartLesson}
          />
        )
    }
  }

  return (
    <div className="app-shell flex flex-col">
      <div className="flex-1 flex flex-col min-h-0">{renderScreen()}</div>
      {NAV_SCREENS.has(screen) && (
        <BottomNav
          active={screen === 'glossary' ? 'glossary' : 'home'}
          onNavigate={(tab) => {
            if (tab === 'home') setScreen('home')
            else if (tab === 'glossary') setScreen('glossary')
            else if (tab === 'practice') setScreen('practiceQuiz')
          }}
        />
      )}
    </div>
  )
}
