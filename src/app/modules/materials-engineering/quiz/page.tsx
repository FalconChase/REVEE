'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  getQuestions,
  getTopics,
  submitExamResult,
  QUIZ_MODE_CONFIG,
} from '@/lib/supabase-quiz'
import { useQuizStore } from '@/lib/quiz-store'
import type { QuizMode } from '@/lib/supabase-quiz'

const MODULE_ID = '7beeda81-5b89-4844-a671-f158297920f0'

export default function QuizPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawMode = searchParams.get('mode') ?? 'standard'
  const mode = (Object.keys(QUIZ_MODE_CONFIG).includes(rawMode) ? rawMode : 'standard') as QuizMode

  const store = useQuizStore()
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const submittedRef = useRef(false)

  // ── Boot ────────────────────────────────────────────────────
  useEffect(() => {
    async function boot() {
      try {
        const topics = await getTopics(MODULE_ID)
        store.setTopics(topics)

        if (mode === 'custom') {
          store.setMode(mode)
          setIsLoading(false)
          return
        }

        const config = QUIZ_MODE_CONFIG[mode]
        const questions = await getQuestions({
          moduleId: MODULE_ID,
          shuffle: true,
          limit: config.questionCount ?? undefined,
        })

        if (!questions.length) {
          setLoadError('No questions found for this module.')
          return
        }

        store.setMode(mode)
        store.startQuiz(questions, config.timeLimit)
        setIsLoading(false)
      } catch {
        setLoadError('Failed to load questions. Please try again.')
      }
    }
    boot()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [mode])

  // ── Timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (store.phase !== 'active' || store.timeRemainingSeconds === null) return
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => store.tickTimer(), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [store.phase, store.timeRemainingSeconds])

  // ── Auto-submit on finish ────────────────────────────────────
  useEffect(() => {
    if (store.phase === 'finished' && !submittedRef.current) {
      submittedRef.current = true
      if (timerRef.current) clearInterval(timerRef.current)
      submitExamResult({
        moduleId: MODULE_ID,
        score: store.getScore(),
        totalQuestions: store.questions.length,
        quizMode: mode,
        topicBreakdown: store.getTopicBreakdown(),
        timeTakenSeconds: store.getTotalTimeTaken(),
      })
    }
  }, [store.phase])

  if (loadError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-red-400 mb-6">{loadError}</p>
          <button onClick={() => router.back()} className="text-zinc-500 hover:text-white text-sm transition">
            ← Go Back
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-400">Loading questions...</p>
      </div>
    )
  }

  if (mode === 'custom' && store.phase === 'setup') {
    return <CustomSetup store={store} onReady={() => setIsLoading(false)} />
  }

  if (store.phase === 'finished') {
    return <ResultsScreen store={store} mode={mode} onBack={() => router.push('/modules/materials-engineering')} />
  }

  const q = store.questions[store.currentIndex]
  if (!q) return null

  const userAnswer = store.answers[q.id]
  const isOpen = mode === 'open'
  const isReview = store.phase === 'review'

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">

      {/* Top bar */}
      <div className="border-b border-zinc-800 px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => {
            if (confirm('Exit quiz? Your progress will be lost.')) {
              store.resetQuiz()
              router.push('/modules/materials-engineering')
            }
          }}
          className="text-zinc-500 hover:text-white text-sm transition"
        >
          ✕ Exit
        </button>
        <div className="flex-1 flex items-center justify-center gap-6">
          <span className="text-zinc-500 text-xs uppercase tracking-widest">
            {QUIZ_MODE_CONFIG[mode].label}
          </span>
          <span className="text-white font-semibold text-sm">
            {store.currentIndex + 1} / {store.questions.length}
          </span>
          {store.timeRemainingSeconds !== null && (
            <TimerDisplay seconds={store.timeRemainingSeconds} />
          )}
        </div>
        <span className="text-zinc-400 text-sm">
          {store.getScore()} correct
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-zinc-800">
        <div
          className="h-full bg-white transition-all duration-300"
          style={{ width: `${((store.currentIndex + 1) / store.questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10 flex flex-col">

        {/* Topic */}
        <p className="text-xs text-zinc-600 uppercase tracking-widest mb-6">
          {store.topics.find((t) => t.id === q.topic_id)?.name ?? 'General'}
        </p>

        {/* Question text */}
        <p className="text-lg text-white leading-relaxed mb-8">{q.question_text}</p>

        {/* Options */}
        <div className="space-y-3 mb-8">
          {(['A', 'B', 'C', 'D'] as const).map((opt) => {
            const text = q[`option_${opt.toLowerCase()}` as keyof typeof q] as string
            const isSelected = userAnswer?.selected === opt
            const isCorrect = q.correct_answer === opt
            const showResult = isOpen && isReview

            let cls = 'border-zinc-800 hover:border-zinc-600'
            if (isSelected && !showResult) cls = 'border-white bg-white/5'
            if (showResult && isCorrect) cls = 'border-green-500 bg-green-500/10'
            if (showResult && isSelected && !isCorrect) cls = 'border-red-500 bg-red-500/10'

            return (
              <button
                key={opt}
                onClick={() => { if (!userAnswer || isOpen) store.answerQuestion(opt) }}
                className={`w-full text-left border rounded-lg px-5 py-4 transition flex gap-4 items-start ${cls} ${
                  userAnswer && !isOpen ? 'cursor-default' : 'cursor-pointer'
                }`}
              >
                <span className={`flex-shrink-0 w-6 h-6 border rounded flex items-center justify-center text-xs font-bold ${
                  isSelected ? 'border-white text-white' : 'border-zinc-700 text-zinc-500'
                }`}>
                  {opt}
                </span>
                <span className="text-zinc-200">{text}</span>
              </button>
            )
          })}
        </div>

        {/* Explanation (open mode) */}
        {isOpen && isReview && q.explanation && (
          <div className="border border-zinc-700 rounded-lg px-5 py-4 mb-6 bg-zinc-900">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Explanation</p>
            <p className="text-zinc-300 text-sm">{q.explanation}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-auto">
          {store.currentIndex > 0 && (
            <button
              onClick={store.prevQuestion}
              className="border border-zinc-700 text-zinc-400 hover:text-white px-5 py-2 rounded-lg text-sm transition"
            >
              ← Prev
            </button>
          )}
          <div className="flex-1" />
          {store.getIsLastQuestion() ? (
            <button
              onClick={store.finishQuiz}
              className="bg-white text-black font-semibold px-8 py-2 rounded-lg text-sm hover:bg-zinc-200 transition"
            >
              Finish Quiz
            </button>
          ) : (
            <button
              onClick={store.nextQuestion}
              disabled={!isOpen && !userAnswer}
              className="border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 px-8 py-2 rounded-lg text-sm transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          )}
        </div>

        {/* Question navigator */}
        <QuestionNav
          total={store.questions.length}
          current={store.currentIndex}
          answers={store.answers}
          questions={store.questions}
          onJump={store.jumpToQuestion}
        />
      </main>
    </div>
  )
}

// ─── Timer ────────────────────────────────────────────────────────────────────

function TimerDisplay({ seconds }: { seconds: number }) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const urgent = seconds < 300
  const pad = (n: number) => n.toString().padStart(2, '0')
  return (
    <span className={`font-mono font-bold tabular-nums ${urgent ? 'text-red-400' : 'text-white'}`}>
      {h > 0 && `${pad(h)}:`}{pad(m)}:{pad(s)}
    </span>
  )
}

// ─── Question navigator ───────────────────────────────────────────────────────

function QuestionNav({
  total, current, answers, questions, onJump,
}: {
  total: number
  current: number
  answers: Record<string, { isCorrect: boolean; selected: string | null }>
  questions: Array<{ id: string }>
  onJump: (i: number) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-8">
      <button
        onClick={() => setOpen(!open)}
        className="text-zinc-600 hover:text-zinc-400 text-xs uppercase tracking-widest transition"
      >
        {open ? '▲ Hide Navigator' : '▼ Question Navigator'}
      </button>
      {open && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {Array.from({ length: total }, (_, i) => {
            const q = questions[i]
            const ans = q ? answers[q.id] : null
            let cls = 'bg-zinc-900 text-zinc-600 border border-zinc-800'
            if (i === current) cls = 'bg-white text-black'
            else if (ans?.isCorrect) cls = 'bg-green-900/40 text-green-400 border border-green-900'
            else if (ans && !ans.isCorrect) cls = 'bg-red-900/40 text-red-400 border border-red-900'
            return (
              <button
                key={i}
                onClick={() => onJump(i)}
                className={`w-8 h-8 text-xs font-bold rounded transition ${cls}`}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Custom Setup ─────────────────────────────────────────────────────────────

function CustomSetup({
  store,
  onReady,
}: {
  store: ReturnType<typeof useQuizStore.getState>
  onReady: () => void
}) {
  const [starting, setStarting] = useState(false)

  async function handleStart() {
    if (!store.selectedTopicIds.length) return
    setStarting(true)
    const questions = await getQuestions({
      moduleId: MODULE_ID,
      topicIds: store.selectedTopicIds,
      shuffle: true,
      limit: store.customQuestionCount,
    })
    store.startQuiz(questions, store.customTimeLimitMinutes * 60)
    onReady()
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Custom Quiz</h1>
        <p className="text-zinc-500 mb-10 text-sm">Configure your session</p>

        {/* Topics */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Topics</h2>
            <div className="flex gap-3">
              <button onClick={store.selectAllTopics} className="text-white text-xs hover:underline">All</button>
              <button onClick={store.clearTopics} className="text-zinc-500 text-xs hover:underline">None</button>
            </div>
          </div>
          <div className="space-y-2">
            {store.topics.map((t) => {
              const checked = store.selectedTopicIds.includes(t.id)
              return (
                <button
                  key={t.id}
                  onClick={() => store.toggleTopic(t.id)}
                  className={`w-full text-left flex items-center gap-3 border rounded-lg px-4 py-3 transition ${
                    checked ? 'border-white bg-white/5' : 'border-zinc-800 text-zinc-500'
                  }`}
                >
                  <span className={`w-4 h-4 border rounded flex items-center justify-center text-xs ${
                    checked ? 'border-white text-white' : 'border-zinc-700'
                  }`}>
                    {checked && '✓'}
                  </span>
                  <span className="flex-1 text-sm">{t.name}</span>
                  <span className="text-xs text-zinc-600">{t.question_count}q</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Count */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-3">
            Questions: <span className="text-white">{store.customQuestionCount}</span>
          </label>
          <input
            type="range" min={10} max={200} step={10}
            value={store.customQuestionCount}
            onChange={(e) => store.setCustomCount(Number(e.target.value))}
            className="w-full accent-white"
          />
          <div className="flex justify-between text-xs text-zinc-600 mt-1">
            <span>10</span><span>200</span>
          </div>
        </div>

        {/* Time */}
        <div className="mb-10">
          <label className="block text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-3">
            Time Limit: <span className="text-white">{store.customTimeLimitMinutes} min</span>
          </label>
          <input
            type="range" min={15} max={240} step={15}
            value={store.customTimeLimitMinutes}
            onChange={(e) => store.setCustomTimeLimit(Number(e.target.value))}
            className="w-full accent-white"
          />
          <div className="flex justify-between text-xs text-zinc-600 mt-1">
            <span>15 min</span><span>4 hrs</span>
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={starting || !store.selectedTopicIds.length}
          className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {starting ? 'Loading...' : 'Start Quiz →'}
        </button>
      </div>
    </div>
  )
}

// ─── Results Screen ───────────────────────────────────────────────────────────

function ResultsScreen({
  store, mode, onBack,
}: {
  store: ReturnType<typeof useQuizStore.getState>
  mode: QuizMode
  onBack: () => void
}) {
  const pct = store.getPercentage()
  const passed = pct >= 70
  const timeTaken = store.getTotalTimeTaken()
  const mm = Math.floor(timeTaken / 60)
  const ss = timeTaken % 60

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-xl mx-auto text-center">

        {/* Score circle */}
        <div className={`inline-flex flex-col items-center justify-center w-36 h-36 rounded-full border-2 mx-auto mb-8 ${
          passed ? 'border-green-500' : 'border-red-500'
        }`}>
          <span className={`text-4xl font-black ${passed ? 'text-green-400' : 'text-red-400'}`}>
            {pct}%
          </span>
          <span className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">
            {passed ? 'Passed' : 'Failed'}
          </span>
        </div>

        <h2 className="text-2xl font-bold mb-1">{passed ? 'Great work!' : 'Keep practicing!'}</h2>
        <p className="text-zinc-500 mb-10">
          {store.getScore()} / {store.questions.length} correct · {mm}m {ss}s
        </p>

        {/* Topic breakdown */}
        <div className="text-left mb-10">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">
            Topic Breakdown
          </h3>
          <div className="space-y-3">
            {store.topics.map((t) => {
              const bd = store.getTopicBreakdown()[t.id]
              if (!bd || bd.total === 0) return null
              const tPct = Math.round((bd.correct / bd.total) * 100)
              return (
                <div key={t.id} className="flex items-center gap-4">
                  <span className="text-zinc-400 text-sm flex-1 truncate">{t.name}</span>
                  <div className="w-28 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: `${tPct}%` }} />
                  </div>
                  <span className="text-xs text-zinc-600 w-12 text-right">{bd.correct}/{bd.total}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onBack}
            className="border border-zinc-700 text-zinc-400 hover:text-white px-6 py-2 rounded-lg text-sm transition"
          >
            ← Back
          </button>
          <button
            onClick={() => { store.resetQuiz(); window.location.reload() }}
            className="bg-white text-black font-semibold px-6 py-2 rounded-lg text-sm hover:bg-zinc-200 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  )
}