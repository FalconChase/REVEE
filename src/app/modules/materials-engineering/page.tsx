'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getTopics, getUserResults, isEnrolled, QUIZ_MODE_CONFIG } from '@/lib/supabase-quiz'
import type { Topic, ExamResult } from '@/lib/supabase-quiz'

const MODULE_ID = '7beeda81-5b89-4844-a671-f158297920f0'

const MODE_ICONS: Record<string, string> = {
  mini: '⚡',
  standard: '📋',
  simulator: '🎯',
  custom: '⚙️',
  open: '📖',
}

export default function MaterialsEngineeringPage() {
  const router = useRouter()
  const [enrolled, setEnrolled] = useState<boolean | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [results, setResults] = useState<ExamResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [enrolledStatus, topicsData, resultsData] = await Promise.all([
        isEnrolled(MODULE_ID),
        getTopics(MODULE_ID),
        getUserResults(MODULE_ID),
      ])

      setEnrolled(enrolledStatus)
      setTopics(topicsData)
      setResults(resultsData)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    )
  }

  if (!enrolled) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-xl font-bold mb-2">Access Required</h2>
          <p className="text-zinc-500 mb-6">You need an access code to unlock this module.</p>
          <Link
            href="/enroll"
            className="inline-block bg-white text-black font-semibold px-6 py-2 rounded-lg hover:bg-zinc-200 transition text-sm"
          >
            Enter Access Code
          </Link>
        </div>
      </div>
    )
  }

  const bestScore = results.length ? Math.max(...results.map((r) => r.percentage)) : null
  const totalQuestions = topics.reduce((sum, t) => sum + (t.question_count ?? 0), 0)

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-2">
          <Link href="/dashboard" className="text-zinc-500 hover:text-white text-sm transition">
            ← Dashboard
          </Link>
        </div>
        <div className="mb-10">
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">
            Board Licensure Examination
          </p>
          <h1 className="text-3xl font-bold">Materials Engineering</h1>
          <p className="text-zinc-500 mt-1">
            {totalQuestions} questions · {topics.length} topics
          </p>
        </div>

        {/* Stats */}
        {results.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Best Score</p>
              <p className="text-2xl font-bold text-white">{bestScore}%</p>
            </div>
            <div className="border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Attempts</p>
              <p className="text-2xl font-bold text-white">{results.length}</p>
            </div>
            <div className="border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Last Score</p>
              <p className="text-2xl font-bold text-white">{results[0]?.percentage}%</p>
            </div>
          </div>
        )}

        {/* Quiz Modes */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">
            Quiz Modes
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.entries(QUIZ_MODE_CONFIG) as [string, typeof QUIZ_MODE_CONFIG[keyof typeof QUIZ_MODE_CONFIG]][]).map(
              ([mode, config]) => (
                <button
                  key={mode}
                  onClick={() => router.push(`/modules/materials-engineering/quiz?mode=${mode}`)}
                  className="group text-left border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span>{MODE_ICONS[mode]}</span>
                    <span className="font-semibold group-hover:text-zinc-200 transition">
                      {config.label}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-sm">{config.description}</p>
                </button>
              )
            )}
          </div>
        </div>

        {/* Topics */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">
            Topics Covered
          </h2>
          <div className="space-y-2">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-center justify-between border border-zinc-800 rounded-lg px-4 py-3"
              >
                <span className="text-zinc-300 text-sm">{topic.name}</span>
                <span className="text-zinc-600 text-xs">{topic.question_count ?? '—'} items</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Results */}
        {results.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">
              Recent Attempts
            </h2>
            <div className="space-y-2">
              {results.slice(0, 5).map((r) => {
                const passed = r.percentage >= 70
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-4 border border-zinc-800 rounded-lg px-4 py-3"
                  >
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        passed ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                      }`}
                    >
                      {r.percentage}%
                    </span>
                    <span className="text-zinc-400 text-sm capitalize flex-1">
                      {QUIZ_MODE_CONFIG[r.quiz_mode as keyof typeof QUIZ_MODE_CONFIG]?.label ?? r.quiz_mode}
                    </span>
                    <span className="text-zinc-600 text-xs">
                      {new Date(r.created_at).toLocaleDateString('en-PH', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}