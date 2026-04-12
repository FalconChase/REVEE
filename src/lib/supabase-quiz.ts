import { createClient } from '@/lib/supabase'

export type Question = {
  id: string
  topic_id: string
  question: string
  choices: string[]
  answer: 'A' | 'B' | 'C' | 'D'
  explanation: string | null
}

export type Topic = {
  id: string
  module_id: string
  name: string
  description: string | null
  question_count: number
}

export type QuizMode = 'mini' | 'standard' | 'simulator' | 'custom' | 'open'

export type ExamResult = {
  id: string
  user_id: string
  module_id: string
  score: number
  total: number
  percentage: number
  mode: string
  taken_at: string
}

const MATERIALS_MODULE_ID = '7beeda81-5b89-4844-a671-f158297920f0'

// ─── Quiz mode config ─────────────────────────────────────────────────────────

export const QUIZ_MODE_CONFIG: Record<
  QuizMode,
  { label: string; questionCount: number | null; timeLimit: number | null; description: string }
> = {
  mini: {
    label: 'Mini Quiz',
    questionCount: 20,
    timeLimit: 20 * 60,
    description: '20 questions · 20 minutes · Quick warm-up',
  },
  standard: {
    label: 'Standard',
    questionCount: 50,
    timeLimit: 60 * 60,
    description: '50 questions · 1 hour · Balanced practice',
  },
  simulator: {
    label: 'Board Exam Simulator',
    questionCount: 100,
    timeLimit: 3 * 60 * 60,
    description: '100 questions · 3 hours · Full exam experience',
  },
  custom: {
    label: 'Custom',
    questionCount: null,
    timeLimit: null,
    description: 'Choose topics, count & time limit',
  },
  open: {
    label: 'Open Review',
    questionCount: null,
    timeLimit: null,
    description: 'No timer · See answers immediately · Study mode',
  },
}

// ─── Topics ───────────────────────────────────────────────────────────────────

export async function getTopics(moduleId = MATERIALS_MODULE_ID): Promise<Topic[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('question_topics')
    .select('*')
    .eq('module_id', moduleId)
    .order('name')

  if (error) throw error
  return data ?? []
}

// ─── Questions ────────────────────────────────────────────────────────────────

export async function getQuestions(opts: {
  moduleId?: string
  topicIds?: string[]
  limit?: number
  shuffle?: boolean
}): Promise<Question[]> {
  const supabase = createClient()
  const moduleId = opts.moduleId ?? MATERIALS_MODULE_ID

  let topicIds = opts.topicIds
  if (!topicIds || topicIds.length === 0) {
    const { data: topics } = await supabase
      .from('question_topics')
      .select('id')
      .eq('module_id', moduleId)
    topicIds = (topics ?? []).map((t) => t.id)
  }

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .in('topic_id', topicIds)

  if (error) throw error

  let questions: Question[] = data ?? []

  if (opts.shuffle) {
    questions = questions.sort(() => Math.random() - 0.5)
  }

  if (opts.limit) {
    questions = questions.slice(0, opts.limit)
  }

  return questions
}

// ─── Enrollment ───────────────────────────────────────────────────────────────

export async function enrollWithCode(code: string): Promise<{
  success: boolean
  moduleId?: string
  moduleName?: string
  error?: string
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: accessCode, error: codeError } = await supabase
    .from('access_codes')
    .select('*, modules(id, title)')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .single()

  if (codeError || !accessCode) {
    return { success: false, error: 'Invalid or expired access code' }
  }

  if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
    return { success: false, error: 'This access code has expired' }
  }

  if (accessCode.max_uses !== null && accessCode.use_count >= accessCode.max_uses) {
    return { success: false, error: 'This access code has reached its usage limit' }
  }

  const { data: existing } = await supabase
    .from('module_enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('module_id', accessCode.module_id)
    .single()

  if (existing) {
    return {
      success: true,
      moduleId: accessCode.module_id,
      moduleName: (accessCode.modules as any)?.title,
    }
  }

  const { error: enrollError } = await supabase
    .from('module_enrollments')
    .insert({
      user_id: user.id,
      module_id: accessCode.module_id,
      access_code_id: accessCode.id,
    })

  if (enrollError) return { success: false, error: 'Failed to enroll. Please try again.' }

  await supabase
    .from('access_codes')
    .update({ use_count: (accessCode.use_count ?? 0) + 1 })
    .eq('id', accessCode.id)

  return {
    success: true,
    moduleId: accessCode.module_id,
    moduleName: (accessCode.modules as any)?.title,
  }
}

export async function isEnrolled(moduleId: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('module_enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('module_id', moduleId)
    .single()

  return !!data
}

// ─── Exam results ─────────────────────────────────────────────────────────────

export async function submitExamResult(payload: {
  moduleId: string
  score: number
  totalQuestions: number
  quizMode: QuizMode
  topicBreakdown: Record<string, { correct: number; total: number }>
  timeTakenSeconds: number
}): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const percentage = Math.round((payload.score / payload.totalQuestions) * 100)

  const { data, error } = await supabase
    .from('exam_results')
    .insert({
    user_id: user.id,
    module_id: payload.moduleId,
    score: payload.score,
    total: payload.totalQuestions,
    percentage,
    mode: payload.quizMode,
  })
    .select('id')
    .single()

  if (error) return null
  return data?.id ?? null
}

export async function getUserResults(moduleId?: string): Promise<ExamResult[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('exam_results')
    .select('*')
    .eq('user_id', user.id)
    .order('taken_at', { ascending: false })

  if (moduleId) query = query.eq('module_id', moduleId)

  const { data } = await query
  return (data ?? []) as ExamResult[]
}

// ─── Creator ──────────────────────────────────────────────────────────────────

export async function generateAccessCode(opts: {
  moduleId: string
  maxUses?: number
  expiresAt?: string
  label?: string
}): Promise<{ code: string } | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const segment = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  const code = `${segment()}-${segment()}`

  const { error } = await supabase.from('access_codes').insert({
    code,
    module_id: opts.moduleId,
    created_by: user.id,
    max_uses: opts.maxUses ?? null,
    expires_at: opts.expiresAt ?? null,
    label: opts.label ?? null,
    is_active: true,
    use_count: 0,
  })

  if (error) return null
  return { code }
}

export async function getCreatorModuleStats(moduleId: string) {
  const supabase = createClient()

  const [codesRes, enrollmentsRes, resultsRes] = await Promise.all([
    supabase
      .from('access_codes')
      .select('*')
      .eq('module_id', moduleId)
      .order('taken_at', { ascending: false }),
    supabase
      .from('module_enrollments')
      .select('*, users(email, full_name)')
      .eq('module_id', moduleId)
      .order('enrolled_at', { ascending: false }),
    supabase
      .from('exam_results')
      .select('*')
      .eq('module_id', moduleId)
      .order('taken_at', { ascending: false }),
  ])

  return {
    codes: codesRes.data ?? [],
    enrollments: enrollmentsRes.data ?? [],
    results: resultsRes.data ?? [],
  }
}