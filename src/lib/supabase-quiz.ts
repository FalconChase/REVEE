import { createClient } from '@/lib/supabase'

// SECTION: Types

export type QuestionType = 'multiple_choice' | 'identification'

export type Question = {
  id: string
  topic_id: string
  question: string
  answer_text: string
  distractors: string[]
  explanation: string | null
  question_type: QuestionType
  id_eligible: boolean
  accepted_answers: string[] | null
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

export type ModuleStatus = 'active' | 'deactivated'
export type ModuleVisibility = 'public' | 'hidden' | 'limited'

export type Module = {
  id: string
  slug: string
  title: string
  description: string | null
  status: ModuleStatus
  visibility: ModuleVisibility
  shuffle_questions: boolean
  shuffle_choices: boolean
  available_modes: string[]
  simulator_pool_rule: string
}

// BLOCK: Quiz mode config
// Every mode here is a candidate; a module's own `available_modes` decides
// which of these it actually offers (see ModuleLanding / quiz boot).

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

// SECTION: Modules

export async function getModuleBySlug(slug: string): Promise<Module | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('modules')
    .select('id, slug, title, description, status, visibility, shuffle_questions, shuffle_choices, available_modes, simulator_pool_rule')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as Module
}

// SECTION: Topics

export async function getTopics(moduleId: string): Promise<Topic[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('question_topics')
    .select('*')
    .eq('module_id', moduleId)
    .order('name')

  if (error) throw error
  return data ?? []
}

// SECTION: Questions

export async function getQuestions(opts: {
  moduleId: string
  topicIds?: string[]
  limit?: number
  shuffle?: boolean
}): Promise<Question[]> {
  const supabase = createClient()
  const moduleId = opts.moduleId

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

// SECTION: Creator question bank

export type ImportRow = {
  topic: string
  question: string
  answer: string
  distractors: string[]
  explanation: string
  type: 'MC' | 'ID'
  acceptedAnswers: string[]
}

// Parses text pasted straight out of Excel (tab-separated rows, one per line)
// in the same column order as the "REVEE Question Bank" template:
// Topic, Question, Answer, Distractor 1-4, Explanation, Type, Accepted Answers.
export function parsePastedQuestions(raw: string): ImportRow[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return []

  const cells = lines.map((l) => l.split('\t'))

  // drop a header row if present
  if (cells[0][0]?.trim().toLowerCase() === 'topic') cells.shift()

  return cells.map((c) => ({
    topic: (c[0] ?? '').trim(),
    question: (c[1] ?? '').trim(),
    answer: (c[2] ?? '').trim(),
    distractors: [c[3], c[4], c[5], c[6]].map((d) => (d ?? '').trim()).filter(Boolean),
    explanation: (c[7] ?? '').trim(),
    type: (c[8] ?? '').trim().toUpperCase() === 'ID' ? 'ID' : 'MC',
    acceptedAnswers: (c[9] ?? '')
      .split(';')
      .map((a) => a.trim())
      .filter(Boolean),
  }))
}

export async function createTopic(moduleId: string, name: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('question_topics')
    .insert({ module_id: moduleId, name: name.trim() })

  return { error: error?.message ?? null }
}

export async function bulkImportQuestions(
  moduleId: string,
  rows: ImportRow[]
): Promise<{ imported: number; error: string | null }> {
  const supabase = createClient()

  const validRows = rows.filter((r) => r.topic && r.question && r.answer)
  if (validRows.length === 0) return { imported: 0, error: 'No valid rows to import.' }

  // resolve topics: reuse existing ones by name, create whatever's missing
  const { data: existingTopics } = await supabase
    .from('question_topics')
    .select('id, name')
    .eq('module_id', moduleId)

  const topicMap = new Map<string, string>()
  for (const t of existingTopics ?? []) topicMap.set(t.name.trim().toLowerCase(), t.id)

  const missingNames = Array.from(
    new Set(validRows.map((r) => r.topic.toLowerCase()))
  ).filter((name) => !topicMap.has(name))

  if (missingNames.length > 0) {
    const { data: newTopics, error: topicError } = await supabase
      .from('question_topics')
      .insert(
        missingNames.map((lower) => ({
          module_id: moduleId,
          name: validRows.find((r) => r.topic.toLowerCase() === lower)!.topic,
        }))
      )
      .select('id, name')

    if (topicError) return { imported: 0, error: topicError.message }
    for (const t of newTopics ?? []) topicMap.set(t.name.trim().toLowerCase(), t.id)
  }

  const payload = validRows.map((r) => ({
    topic_id: topicMap.get(r.topic.toLowerCase()),
    question: r.question,
    answer_text: r.answer,
    distractors: r.type === 'ID' ? [] : r.distractors,
    explanation: r.explanation || null,
    question_type: r.type === 'ID' ? 'identification' : 'multiple_choice',
    id_eligible: r.type === 'ID',
    accepted_answers: r.acceptedAnswers.length > 0 ? r.acceptedAnswers : null,
  }))

  const { error: insertError } = await supabase.from('questions').insert(payload)
  if (insertError) return { imported: 0, error: insertError.message }

  return { imported: payload.length, error: null }
}

export async function deleteQuestion(questionId: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('questions').delete().eq('id', questionId)
  return { error: error?.message ?? null }
}

// SECTION: Enrollment

type AccessCodeModuleJoin = { id: string; title: string; slug: string }

export async function enrollWithCode(code: string): Promise<{
  success: boolean
  moduleId?: string
  moduleSlug?: string
  moduleName?: string
  error?: string
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: accessCode, error: codeError } = await supabase
    .from('access_codes')
    .select('*, modules(id, title, slug)')
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
      moduleSlug: (accessCode.modules as unknown as AccessCodeModuleJoin | null)?.slug,
      moduleName: (accessCode.modules as unknown as AccessCodeModuleJoin | null)?.title,
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
    moduleSlug: (accessCode.modules as unknown as AccessCodeModuleJoin | null)?.slug,
    moduleName: (accessCode.modules as unknown as AccessCodeModuleJoin | null)?.title,
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

// SECTION: Access requests

export type AccessRequestStatus = 'none' | 'pending' | 'denied'

export async function getAccessRequestStatus(moduleId: string): Promise<AccessRequestStatus> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'none'

  const { data } = await supabase
    .from('module_access_requests')
    .select('status')
    .eq('module_id', moduleId)
    .eq('user_id', user.id)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data || data.status === 'approved') return 'none'
  return data.status as AccessRequestStatus
}

export async function requestModuleAccess(moduleId: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const { error } = await supabase
    .from('module_access_requests')
    .insert({ module_id: moduleId, user_id: user.id })

  return { error: error?.message ?? null }
}

export type PendingAccessRequest = {
  id: string
  module_id: string
  user_id: string
  requested_at: string
  message: string | null
  module: { title: string; slug: string } | null
  requester: { full_name: string; email: string } | null
}

export async function getPendingAccessRequests(): Promise<PendingAccessRequest[]> {
  const supabase = createClient()

  const { data } = await supabase
    .from('module_access_requests')
    .select('id, module_id, user_id, requested_at, message, modules(title, slug)')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })

  type Row = {
    id: string
    module_id: string
    user_id: string
    requested_at: string
    message: string | null
    modules: { title: string; slug: string } | { title: string; slug: string }[] | null
  }

  const rows = (data ?? []) as Row[]

  return Promise.all(
    rows.map(async (r) => {
      const { data: profile } = await supabase
        .rpc('get_user_profile', { user_id: r.user_id })
      const mod = Array.isArray(r.modules) ? r.modules[0] ?? null : r.modules
      return {
        id: r.id,
        module_id: r.module_id,
        user_id: r.user_id,
        requested_at: r.requested_at,
        message: r.message,
        module: mod,
        requester: profile?.[0] ?? null,
      }
    })
  )
}

export async function resolveAccessRequest(
  requestId: string,
  action: 'approve' | 'deny'
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const { data: request, error: fetchError } = await supabase
    .from('module_access_requests')
    .select('module_id, user_id')
    .eq('id', requestId)
    .single()

  if (fetchError || !request) return { error: fetchError?.message ?? 'Request not found' }

  if (action === 'approve') {
    const { error: enrollError } = await supabase
      .from('module_enrollments')
      .insert({ module_id: request.module_id, user_id: request.user_id })

    if (enrollError) return { error: enrollError.message }
  }

  const { error: updateError } = await supabase
    .from('module_access_requests')
    .update({
      status: action === 'approve' ? 'approved' : 'denied',
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq('id', requestId)

  return { error: updateError?.message ?? null }
}

// SECTION: Exam results

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

// SECTION: Creator

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
      .order('created_at', { ascending: false }),
    supabase
      .from('module_enrollments')
      .select('*')
      .eq('module_id', moduleId)
      .order('enrolled_at', { ascending: false }),
    supabase
      .from('exam_results')
      .select('*')
      .eq('module_id', moduleId)
      .order('taken_at', { ascending: false }),
  ])
// Fetch user details separately for each enrollment
  const enrollments = enrollmentsRes.data ?? []
  const enrichedEnrollments = await Promise.all(
    enrollments.map(async (e) => {
      const { data: userData } = await supabase
        .rpc('get_user_profile', { user_id: e.user_id })
      return {
        ...e,
        users: userData?.[0] ?? null
      }
    })
  )

  return {
    codes: codesRes.data ?? [],
    enrollments: enrichedEnrollments,
    results: resultsRes.data ?? [],
  }
}
