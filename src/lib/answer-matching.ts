// SECTION: Answer matching
// Shared, pure grading + presentation logic for every module's quiz engine.
// The identification-mode matching (Levenshtein tolerance, numeric tolerance,
// curated accepted answers) is ported from the reference DPWH implementation;
// the choice-pool shuffling is new, built for REVEE's anti-memorization
// requirement: the correct answer must never sit at a fixed letter, and the
// wrong-choice set itself should rotate when a bigger distractor pool exists.

import type { Question } from './supabase-quiz'

// BLOCK: Generic shuffle

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

// BLOCK: Identification-mode matching
// Damerau-style edit distance (adjacent transposition counts as 1) - used only to
// forgive small typos, never as a substitute for actually knowing the answer.
function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost)
      }
    }
  }
  return dp[m][n]
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}

// Parses a string like "101.86%", "3,000 psi", "50mm" into { value, unit }.
// Returns null if the string isn't (mostly) a bare number - i.e. it's a phrase,
// not a measurement/quantity, so numeric comparison doesn't apply.
function parseNumericAnswer(s: string): { value: number; unit: string } | null {
  const cleaned = s.trim().toLowerCase().replace(/,/g, '')
  const match = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*([a-z%°]*)$/)
  if (!match) return null
  const value = parseFloat(match[1])
  if (Number.isNaN(value)) return null
  return { value, unit: match[2] || '' }
}

// Numeric answers (percentages, measurements) get compared by value + unit, with a
// small tolerance, instead of exact text - so "101.9%" vs "101.86%" or a missing "%"
// doesn't unfairly fail someone who clearly knows the right number.
function numericAnswersMatch(userAnswer: string, actualAnswer: string): boolean {
  const userNum = parseNumericAnswer(userAnswer)
  const actualNum = parseNumericAnswer(actualAnswer)
  if (!userNum || !actualNum) return false

  // If both sides specified a unit, it must match (case-insensitive) - "50mm" should not
  // match "50cm". If either side omitted the unit, don't penalize (user just typed the number).
  if (userNum.unit && actualNum.unit && userNum.unit !== actualNum.unit) return false

  const tolerance = Math.max(0.05, Math.abs(actualNum.value) * 0.01) // 1% relative, floor 0.05
  return Math.abs(userNum.value - actualNum.value) <= tolerance
}

// Grades a typed identification answer against the canonical answer plus any curated
// acceptedAnswers (abbreviations/synonyms). Deliberately strict: it will forgive a couple
// of fat-finger typos (via edit distance, scaled to answer length) but will NOT accept a
// single matching keyword or a partial substring of a longer answer.
export function isIdentificationStringCorrect(
  userAnswer: string,
  acceptedAnswers: string | string[]
): boolean {
  if (!userAnswer || userAnswer.trim() === '') return false

  const userClean = normalizeForMatch(userAnswer)
  const list = Array.isArray(acceptedAnswers) ? acceptedAnswers : [acceptedAnswers]

  const userNum = parseNumericAnswer(userAnswer)

  for (const accepted of list) {
    // If BOTH sides parse as a bare number(+unit), this pair is graded purely numerically -
    // never fall through to fuzzy text matching, where a 1-digit or 1-letter-unit difference
    // ("50cm" vs "50mm") can look like a harmless "typo" by edit distance but is actually wrong.
    const acceptedNum = parseNumericAnswer(accepted)
    if (userNum && acceptedNum) {
      if (numericAnswersMatch(userAnswer, accepted)) return true
      continue
    }

    const actualClean = normalizeForMatch(accepted)
    if (!actualClean) continue
    if (userClean === actualClean) return true

    const lenRatio = Math.min(userClean.length, actualClean.length) / Math.max(userClean.length, actualClean.length)
    if (lenRatio > 0.6) {
      const dist = levenshteinDistance(userClean, actualClean)
      const threshold = Math.min(3, Math.max(1, Math.floor(actualClean.length * 0.12)))
      if (dist <= threshold) return true
    }
  }
  return false
}

// BLOCK: Multiple-choice presentation
// Builds the option set a question is actually shown with: the correct answer
// plus up to 3 distractors drawn from its pool (a pool bigger than 3 rotates
// which wrong choices appear), in randomized order when shuffling is on.
// Computed once per question per attempt by the caller and cached - never
// recomputed on every render, so the set a learner answered against is the
// same one shown back to them in review.
const MAX_PRESENTED_CHOICES = 4
const MAX_PRESENTED_DISTRACTORS = MAX_PRESENTED_CHOICES - 1

export function pickPresentedChoices(question: Question, shuffle: boolean): string[] {
  const distractorPool = question.distractors ?? []
  const sampledDistractors = shuffle
    ? shuffleArray(distractorPool).slice(0, MAX_PRESENTED_DISTRACTORS)
    : distractorPool.slice(0, MAX_PRESENTED_DISTRACTORS)

  const options = [question.answer_text, ...sampledDistractors]
  return shuffle ? shuffleArray(options) : options
}

// A question with its presented multiple-choice options locked in for the
// current attempt. Computed once at quiz start via prepareQuestions - never
// recomputed mid-attempt.
export type PreparedQuestion = Question & { presentedChoices: string[] }

export function prepareQuestions(questions: Question[], shuffleChoices: boolean): PreparedQuestion[] {
  return questions.map((q) => ({
    ...q,
    presentedChoices: q.question_type === 'identification' ? [] : pickPresentedChoices(q, shuffleChoices),
  }))
}
