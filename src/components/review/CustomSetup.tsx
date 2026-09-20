'use client'

import { useState } from 'react'
import { getQuestions } from '@/lib/supabase-quiz'
import { useQuizStore } from '@/lib/quiz-store'

// Custom-mode configuration screen: pick topics, question count and time
// limit, then start the quiz. Extracted from the old materials-engineering
// quiz page — now reads moduleId off the store instead of a hardcoded const.

export default function CustomSetup({
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
      moduleId: store.moduleId,
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
