'use client'

// ============================================================
// SECTION: Imports
// ============================================================
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUserResults } from '@/lib/supabase-quiz'

// ============================================================
// SECTION: Types
// ============================================================
type User = {
  id: string
  email: string
  full_name: string
  role: string
}

type Module = {
  id: string
  name: string
  description: string | null
  subject_code: string | null
}

type RecentResult = {
  id: string
  percentage: number
  quiz_mode: string
  created_at: string
}

// ============================================================
// SECTION: Component
// ============================================================
export default function DashboardPage() {

  // ----------------------------------------------------------
  // BLOCK: Hooks
  // ----------------------------------------------------------
  const router = useRouter()
  const supabase = createClient()

  // ----------------------------------------------------------
  // BLOCK: State
  // ----------------------------------------------------------
  const [user, setUser] = useState<User | null>(null)
  const [enrolledModules, setEnrolledModules] = useState<Module[]>([])
  const [recentResults, setRecentResults] = useState<RecentResult[]>([])
  const [loading, setLoading] = useState(true)

  // ----------------------------------------------------------
  // BLOCK: Effects
  // ----------------------------------------------------------
  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error || !data) {
        router.push('/login')
        return
      }

      if (data.role === 'creator') {
        router.push('/creator')
        return
      }

      setUser(data)

      // Load enrolled modules
      const { data: enrollments } = await supabase
        .from('module_enrollments')
        .select('module_id, modules(id, name, description, subject_code)')
        .eq('user_id', authUser.id)

      const mods = (enrollments ?? [])
        .map((e: any) => e.modules)
        .filter(Boolean) as Module[]

      setEnrolledModules(mods)

      // Load recent results
      const results = await getUserResults()
      setRecentResults(results.slice(0, 5) as RecentResult[])

      setLoading(false)
    }

    loadUser()
  }, [])

  // ----------------------------------------------------------
  // BLOCK: Loading State
  // ----------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    )
  }

  // ----------------------------------------------------------
  // BLOCK: Render
  // ----------------------------------------------------------
  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-4xl mx-auto">

        {/* BLOCK: Header */}
        <div className="mb-10 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {user?.full_name} 👋</h1>
            <p className="text-zinc-400 mt-1">Your REVEE learner dashboard</p>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="text-zinc-500 hover:text-white text-sm transition"
          >
            Sign out
          </button>
        </div>

        {/* BLOCK: Enrolled Modules */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">My Modules</h2>
            <Link
              href="/enroll"
              className="text-sm text-zinc-400 hover:text-white transition"
            >
              + Enter access code
            </Link>
          </div>

          {enrolledModules.length === 0 ? (
            // BLOCK: Empty State - No Modules Yet
            <div className="border border-zinc-800 rounded-xl p-10 text-center">
              <p className="text-zinc-500 text-lg">No modules enrolled yet.</p>
              <p className="text-zinc-600 text-sm mt-2">
                Enter an access code to get started.
              </p>
              <Link
                href="/enroll"
                className="inline-block mt-4 text-sm text-white border border-zinc-700 rounded-lg px-4 py-2 hover:border-zinc-500 transition"
              >
                Enter Access Code
              </Link>
            </div>
          ) : (
            // BLOCK: Module Cards
            <div className="grid gap-4 sm:grid-cols-2">
              {enrolledModules.map((mod) => (
                <Link
                  key={mod.id}
                  href="/modules/materials-engineering"
                  className="block border border-zinc-800 rounded-xl p-6 hover:border-zinc-600 transition group"
                >
                  {mod.subject_code && (
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                      {mod.subject_code}
                    </p>
                  )}
                  <h3 className="font-semibold text-white group-hover:text-zinc-200 transition">
                    {mod.name}
                  </h3>
                  {mod.description && (
                    <p className="text-zinc-500 text-sm mt-1">{mod.description}</p>
                  )}
                  <p className="text-xs text-zinc-600 mt-3">Open module →</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* BLOCK: Recent Activity */}
        {recentResults.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
            <div className="space-y-2">
              {recentResults.map((r) => {
                const passed = r.percentage >= 70
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-4 border border-zinc-800 rounded-lg px-4 py-3"
                  >
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        passed
                          ? 'bg-green-900/40 text-green-400'
                          : 'bg-red-900/40 text-red-400'
                      }`}
                    >
                      {r.percentage}%
                    </span>
                    <span className="text-zinc-400 text-sm capitalize flex-1">
                      {r.quiz_mode} mode
                    </span>
                    <span className="text-zinc-600 text-xs">
                      {new Date(r.created_at).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
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