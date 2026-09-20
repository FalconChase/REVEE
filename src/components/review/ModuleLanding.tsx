'use client'

// SECTION: ModuleLanding
// The reviewee-facing module home: stats, quiz-mode picker, topic list and
// recent attempts. Generalized from the old materials-engineering page —
// driven entirely by the module/topics/results passed in, so it renders the
// same way for any module.

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QUIZ_MODE_CONFIG } from '@/lib/supabase-quiz'
import type { Module, Topic, ExamResult, QuizMode } from '@/lib/supabase-quiz'

const MODE_ICONS: Record<string, string> = {
  mini: '⚡',
  standard: '📋',
  simulator: '🎯',
  custom: '⚙️',
  open: '📖',
}

// BLOCK: Props
type ModuleLandingProps = {
  module: Module
  topics: Topic[]
  results: ExamResult[]
  basePath: string // e.g. `/modules/materials-engineering`
}

export default function ModuleLanding({ module, topics, results, basePath }: ModuleLandingProps) {
  const router = useRouter()

  const bestScore = results.length ? Math.max(...results.map((r) => r.percentage)) : null
  const totalQuestions = topics.reduce((sum, t) => sum + (t.question_count ?? 0), 0)

  // BLOCK: Available modes — filtered by the module's own available_modes
  const offeredModes = (Object.entries(QUIZ_MODE_CONFIG) as [QuizMode, typeof QUIZ_MODE_CONFIG[QuizMode]][])
    .filter(([mode]) => module.available_modes?.includes(mode))

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
          <h1 className="text-3xl font-bold">{module.title}</h1>
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
            {offeredModes.map(([mode, config]) => (
              <button
                key={mode}
                onClick={() => router.push(`${basePath}/quiz?mode=${mode}`)}
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
            ))}
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
                      {QUIZ_MODE_CONFIG[r.mode as keyof typeof QUIZ_MODE_CONFIG]?.label ?? r.mode}
                    </span>
                    <span className="text-zinc-600 text-xs">
                      {new Date(r.taken_at).toLocaleDateString('en-PH', {
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
