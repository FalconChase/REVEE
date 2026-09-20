'use client'

import { useState } from 'react'
import type { UserAnswer } from '@/lib/quiz-store'

// Collapsible jump-to-question strip shown below the active question.
// Extracted as-is from the old materials-engineering quiz page.

export default function QuestionNav({
  total, current, answers, questions, onJump,
}: {
  total: number
  current: number
  answers: Record<string, UserAnswer>
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
