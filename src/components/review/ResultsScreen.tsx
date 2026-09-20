'use client'

import type { useQuizStore } from '@/lib/quiz-store'
import type { QuizMode } from '@/lib/supabase-quiz'

// Post-quiz score + topic breakdown screen. Extracted as-is from the old
// materials-engineering quiz page; `onBack` carries the module's own path so
// this works the same for any module.

export default function ResultsScreen({
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
