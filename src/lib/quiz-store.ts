import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Question, QuizMode, Topic } from './supabase-quiz'
import { isIdentificationStringCorrect, prepareQuestions, type PreparedQuestion } from './answer-matching'

export type UserAnswer = {
  questionId: string
  selected: string | null
  isCorrect: boolean
  timeTaken: number
}

export type QuizPhase =
  | 'idle'
  | 'setup'
  | 'active'
  | 'review'
  | 'finished'

type QuizStore = {
  // Config
  mode: QuizMode | null
  moduleId: string
  shuffleQuestions: boolean
  shuffleChoices: boolean
  selectedTopicIds: string[]
  customQuestionCount: number
  customTimeLimitMinutes: number

  // Session
  phase: QuizPhase
  questions: PreparedQuestion[]
  topics: Topic[]
  currentIndex: number
  answers: Record<string, UserAnswer>
  startTime: number | null
  questionStartTime: number | null
  timeRemainingSeconds: number | null

  // Actions
  setModuleId: (moduleId: string) => void
  setModuleSettings: (settings: { shuffleQuestions: boolean; shuffleChoices: boolean }) => void
  setTopics: (topics: Topic[]) => void
  setMode: (mode: QuizMode) => void
  toggleTopic: (topicId: string) => void
  selectAllTopics: () => void
  clearTopics: () => void
  setCustomCount: (n: number) => void
  setCustomTimeLimit: (min: number) => void
  startQuiz: (questions: Question[], timeLimitSeconds: number | null) => void
  answerQuestion: (selected: string) => void
  nextQuestion: () => void
  prevQuestion: () => void
  jumpToQuestion: (index: number) => void
  tickTimer: () => void
  finishQuiz: () => void
  resetQuiz: () => void

  // Computed
  getScore: () => number
  getPercentage: () => number
  getIsLastQuestion: () => boolean
  getTopicBreakdown: () => Record<string, { correct: number; total: number }>
  getTotalTimeTaken: () => number
}

export const useQuizStore = create<QuizStore>()(
  devtools(
    (set, get) => ({
      // Config
      mode: null,
      moduleId: '',
      shuffleQuestions: true,
      shuffleChoices: true,
      selectedTopicIds: [],
      customQuestionCount: 50,
      customTimeLimitMinutes: 60,

      // Session
      phase: 'idle',
      questions: [],
      topics: [],
      currentIndex: 0,
      answers: {},
      startTime: null,
      questionStartTime: null,
      timeRemainingSeconds: null,

      // Actions
      setModuleId: (moduleId) => set({ moduleId }),

      setModuleSettings: (settings) =>
        set({ shuffleQuestions: settings.shuffleQuestions, shuffleChoices: settings.shuffleChoices }),

      setTopics: (topics) => set({ topics, selectedTopicIds: topics.map((t) => t.id) }),

      setMode: (mode) => set({ mode, phase: 'setup' }),

      toggleTopic: (topicId) =>
        set((s) => ({
          selectedTopicIds: s.selectedTopicIds.includes(topicId)
            ? s.selectedTopicIds.filter((id) => id !== topicId)
            : [...s.selectedTopicIds, topicId],
        })),

      selectAllTopics: () => set((s) => ({ selectedTopicIds: s.topics.map((t) => t.id) })),

      clearTopics: () => set({ selectedTopicIds: [] }),

      setCustomCount: (n) => set({ customQuestionCount: n }),

      setCustomTimeLimit: (min) => set({ customTimeLimitMinutes: min }),

      // BLOCK: startQuiz
      // Presented multiple-choice options are computed once here (via
      // prepareQuestions) and locked into each question for the rest of the
      // attempt - jumping between questions or reviewing later never
      // reshuffles what the learner already saw.
      startQuiz: (questions, timeLimitSeconds) => {
        const { shuffleQuestions, shuffleChoices } = get()
        const ordered = shuffleQuestions ? [...questions].sort(() => Math.random() - 0.5) : questions
        set({
          phase: 'active',
          questions: prepareQuestions(ordered, shuffleChoices),
          currentIndex: 0,
          answers: {},
          startTime: Date.now(),
          questionStartTime: Date.now(),
          timeRemainingSeconds: timeLimitSeconds,
        })
      },

      // BLOCK: answerQuestion
      // Grading branches on question_type: multiple-choice is exact text
      // match against answer_text (never letter position); identification
      // runs the fuzzy/numeric-tolerant matcher against the curated
      // accepted answers (falling back to answer_text alone).
      answerQuestion: (selected) => {
        const { questions, currentIndex, answers, questionStartTime, mode } = get()
        const q = questions[currentIndex]
        if (!q) return
        if (mode !== 'open' && answers[q.id]) return

        const timeTaken = questionStartTime
          ? Math.round((Date.now() - questionStartTime) / 1000)
          : 0

        const isCorrect =
          q.question_type === 'identification'
            ? isIdentificationStringCorrect(selected, q.accepted_answers?.length ? q.accepted_answers : [q.answer_text])
            : selected === q.answer_text

        set((s) => ({
          answers: {
            ...s.answers,
            [q.id]: { questionId: q.id, selected, isCorrect, timeTaken },
          },
          phase: s.mode === 'open' ? 'review' : 'active',
        }))
      },

      nextQuestion: () =>
        set((s) => {
          const next = s.currentIndex + 1
          if (next >= s.questions.length) return s
          return { currentIndex: next, questionStartTime: Date.now(), phase: 'active' }
        }),

      prevQuestion: () =>
        set((s) => ({
          currentIndex: Math.max(0, s.currentIndex - 1),
          phase: 'active',
        })),

      jumpToQuestion: (index) =>
        set((s) => ({
          currentIndex: Math.max(0, Math.min(index, s.questions.length - 1)),
          phase: 'active',
          questionStartTime: Date.now(),
        })),

      tickTimer: () =>
        set((s) => {
          if (s.timeRemainingSeconds === null) return s
          const next = s.timeRemainingSeconds - 1
          if (next <= 0) return { timeRemainingSeconds: 0, phase: 'finished' }
          return { timeRemainingSeconds: next }
        }),

      finishQuiz: () => set({ phase: 'finished' }),

      resetQuiz: () =>
        set({
          phase: 'idle',
          mode: null,
          questions: [],
          currentIndex: 0,
          answers: {},
          startTime: null,
          questionStartTime: null,
          timeRemainingSeconds: null,
          selectedTopicIds: [],
        }),

      // Computed (as functions since Zustand doesn't support getters well)
      getScore: () => Object.values(get().answers).filter((a) => a.isCorrect).length,

      getPercentage: () => {
        const { answers, questions } = get()
        if (!questions.length) return 0
        const correct = Object.values(answers).filter((a) => a.isCorrect).length
        return Math.round((correct / questions.length) * 100)
      },

      getIsLastQuestion: () => {
        const { currentIndex, questions } = get()
        return currentIndex === questions.length - 1
      },

      getTopicBreakdown: () => {
        const { questions, answers, topics } = get()
        const breakdown: Record<string, { correct: number; total: number }> = {}
        for (const t of topics) breakdown[t.id] = { correct: 0, total: 0 }
        for (const q of questions) {
          if (!breakdown[q.topic_id]) breakdown[q.topic_id] = { correct: 0, total: 0 }
          breakdown[q.topic_id].total += 1
          if (answers[q.id]?.isCorrect) breakdown[q.topic_id].correct += 1
        }
        return breakdown
      },

      getTotalTimeTaken: () => {
        const { startTime } = get()
        if (!startTime) return 0
        return Math.round((Date.now() - startTime) / 1000)
      },
    }),
    { name: 'revee-quiz' }
  )
)
