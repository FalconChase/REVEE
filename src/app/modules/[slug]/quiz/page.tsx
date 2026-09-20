'use client'

// SECTION: Quiz page (generic, slug-driven)
// Replaces the old hardcoded materials-engineering/quiz/page.tsx. Resolves
// the module by slug, boots the quiz store against its real id, then
// delegates rendering to the shared review-template components.

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import {
  getQuestions,
  getTopics,
  submitExamResult,
  getModuleBySlug,
  QUIZ_MODE_CONFIG,
} from '@/lib/supabase-quiz'
import { useQuizStore } from '@/lib/quiz-store'
import type { QuizMode } from '@/lib/supabase-quiz'
import QuizRunner from '@/components/review/QuizRunner'
import CustomSetup from '@/components/review/CustomSetup'
import ResultsScreen from '@/components/review/ResultsScreen'

export default function QuizPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
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
        const mod = await getModuleBySlug(slug)
        if (!mod) {
          setLoadError('This module could not be found.')
          return
        }
        if (mod.status === 'deactivated') {
          setLoadError('This module has been deactivated.')
          return
        }

        store.setModuleId(mod.id)
        store.setModuleSettings({
          shuffleQuestions: mod.shuffle_questions,
          shuffleChoices: mod.shuffle_choices,
        })

        const topics = await getTopics(mod.id)
        store.setTopics(topics)

        if (mode === 'custom') {
          store.setMode(mode)
          setIsLoading(false)
          return
        }

        const config = QUIZ_MODE_CONFIG[mode]
        const questions = await getQuestions({
          moduleId: mod.id,
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
  }, [mode, slug])

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
        moduleId: store.moduleId,
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

  const basePath = `/modules/${slug}`

  if (mode === 'custom' && store.phase === 'setup') {
    return <CustomSetup store={store} onReady={() => setIsLoading(false)} />
  }

  if (store.phase === 'finished') {
    return <ResultsScreen store={store} mode={mode} onBack={() => router.push(basePath)} />
  }

  return <QuizRunner store={store} mode={mode} onExit={() => router.push(basePath)} />
}
