'use client'

import { useState } from 'react'
import { useQuizStore } from '@/lib/quiz-store'
import { QUIZ_MODE_CONFIG } from '@/lib/supabase-quiz'
import type { QuizMode } from '@/lib/supabase-quiz'
import TimerDisplay from './TimerDisplay'
import QuestionNav from './QuestionNav'

// SECTION: QuizRunner
// The active question-answer screen: top bar (exit / progress / timer),
// question card, choice buttons (multiple_choice) or a typed-answer field
// (identification), explanation (open mode) and navigation. Grading and the
// presented option set both come off the store - this component never
// compares against a fixed letter.

export default function QuizRunner({
  store, mode, onExit,
}: {
  store: ReturnType<typeof useQuizStore.getState>
  mode: QuizMode
  onExit: () => void
}) {
  const q = store.questions[store.currentIndex]
  const [typedAnswer, setTypedAnswer] = useState('')

  if (!q) return null

  const userAnswer = store.answers[q.id]
  const isOpen = mode === 'open'
  const isReview = store.phase === 'review'
  const isIdentification = q.question_type === 'identification'

  function submitTyped() {
    if (!typedAnswer.trim()) return
    store.answerQuestion(typedAnswer.trim())
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">

      {/* BLOCK: Top bar */}
      <div className="border-b border-zinc-800 px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => {
            if (confirm('Exit quiz? Your progress will be lost.')) {
              store.resetQuiz()
              onExit()
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

      {/* BLOCK: Progress bar */}
      <div className="h-0.5 bg-zinc-800">
        <div
          className="h-full bg-white transition-all duration-300"
          style={{ width: `${((store.currentIndex + 1) / store.questions.length) * 100}%` }}
        />
      </div>

      {/* BLOCK: Question */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10 flex flex-col">

        {/* Topic */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-zinc-600 uppercase tracking-widest">
            {store.topics.find((t) => t.id === q.topic_id)?.name ?? 'General'}
          </p>
          {isIdentification && (
            <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Identification
            </span>
          )}
        </div>

        {/* Question text */}
        <p className="text-lg text-white leading-relaxed mb-8">{q.question}</p>

        {/* BLOCK: Answer input */}
        {isIdentification ? (
          <div className="mb-8">
            <label className="block text-zinc-500 text-xs uppercase tracking-widest mb-2">
              Type your answer
            </label>
            {userAnswer ? (
              <div className={`border rounded-lg px-5 py-4 ${
                userAnswer.isCorrect ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'
              }`}>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Your answer</p>
                <p className={userAnswer.isCorrect ? 'text-green-400' : 'text-red-400'}>{userAnswer.selected}</p>
                {!userAnswer.isCorrect && (
                  <>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mt-3 mb-1">Correct answer</p>
                    <p className="text-green-400">{q.answer_text}</p>
                  </>
                )}
              </div>
            ) : (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitTyped() }}
                  placeholder="Enter your answer here..."
                  className="flex-1 bg-zinc-900 border border-zinc-700 text-white px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-zinc-500 placeholder:text-zinc-700 transition"
                  autoFocus
                />
                <button
                  onClick={submitTyped}
                  disabled={!typedAnswer.trim()}
                  className="bg-white text-black font-semibold px-6 py-3 rounded-lg text-sm hover:bg-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {q.presentedChoices.map((text, idx) => {
              const letter = String.fromCharCode(65 + idx)
              const isSelected = userAnswer?.selected === text
              const isCorrect = text === q.answer_text
              const showResult = isOpen && isReview

              let cls = 'border-zinc-800 hover:border-zinc-600'
              if (isSelected && !showResult) cls = 'border-white bg-white/5'
              if (showResult && isCorrect) cls = 'border-green-500 bg-green-500/10'
              if (showResult && isSelected && !isCorrect) cls = 'border-red-500 bg-red-500/10'

              return (
                <button
                  key={text}
                  onClick={() => { if (!userAnswer || isOpen) store.answerQuestion(text) }}
                  className={`w-full text-left border rounded-lg px-5 py-4 transition flex gap-4 items-start ${cls} ${
                    userAnswer && !isOpen ? 'cursor-default' : 'cursor-pointer'
                  }`}
                >
                  <span className={`flex-shrink-0 w-6 h-6 border rounded flex items-center justify-center text-xs font-bold ${
                    isSelected ? 'border-white text-white' : 'border-zinc-700 text-zinc-500'
                  }`}>
                    {letter}
                  </span>
                  <span className="text-zinc-200">{text}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Explanation (open mode) */}
        {isOpen && isReview && q.explanation && (
          <div className="border border-zinc-700 rounded-lg px-5 py-4 mb-6 bg-zinc-900">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Explanation</p>
            <p className="text-zinc-300 text-sm">{q.explanation}</p>
          </div>
        )}

        {/* BLOCK: Navigation */}
        <div className="flex items-center gap-3 mt-auto">
          {store.currentIndex > 0 && (
            <button
              onClick={() => { setTypedAnswer(''); store.prevQuestion() }}
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
              onClick={() => { setTypedAnswer(''); store.nextQuestion() }}
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
          onJump={(i) => { setTypedAnswer(''); store.jumpToQuestion(i) }}
        />
      </main>
    </div>
  )
}
