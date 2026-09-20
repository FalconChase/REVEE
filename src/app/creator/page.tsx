'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getPendingAccessRequests,
  resolveAccessRequest,
  type PendingAccessRequest,
} from '@/lib/supabase-quiz'

type User = {
  id: string
  email: string
  full_name: string
  role: string
  is_creator: boolean
}

type Module = {
  id: string
  title: string
  description: string
  slug: string
  is_active: boolean
  created_at: string
}

type Stats = {
  modules: number
  learners: number
  access_codes: number
}

export default function CreatorPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [stats, setStats] = useState<Stats>({ modules: 0, learners: 0, access_codes: 0 })
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<PendingAccessRequest[]>([])
  const [requestsOpen, setRequestsOpen] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error || !userData) {
        router.push('/dashboard')
        return
      }

      setUser(userData)

      // Fetch modules
      const { data: modulesData } = await supabase
        .from('modules')
        .select('*')
        .eq('created_by', authUser.id)
        .order('created_at', { ascending: false })

      const fetchedModules = modulesData || []
      setModules(fetchedModules)

      // Fetch learner count
      const moduleIds = fetchedModules.map((m) => m.id)
      let learnerCount = 0
      let codeCount = 0

      if (moduleIds.length > 0) {
        const { count: lc } = await supabase
          .from('module_enrollments')
          .select('*', { count: 'exact', head: true })
          .in('module_id', moduleIds)

        const { count: cc } = await supabase
          .from('access_codes')
          .select('*', { count: 'exact', head: true })
          .in('module_id', moduleIds)

        learnerCount = lc || 0
        codeCount = cc || 0
      }

      setStats({
        modules: fetchedModules.length,
        learners: learnerCount,
        access_codes: codeCount,
      })

      setRequests(await getPendingAccessRequests())

      setLoading(false)
    }

    loadData()
  }, [])

  async function handleResolve(requestId: string, action: 'approve' | 'deny') {
    setResolvingId(requestId)
    const { error } = await resolveAccessRequest(requestId, action)
    if (!error) {
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
      if (action === 'approve') {
        setStats((prev) => ({ ...prev, learners: prev.learners + 1 }))
      }
    }
    setResolvingId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Creator Studio</h1>
            <p className="text-zinc-400 mt-1">Welcome back, {user?.full_name} 🦅</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setRequestsOpen((v) => !v)}
                className="relative rounded-full border border-zinc-800 p-2 text-zinc-300 hover:border-emerald-400/30 hover:text-white transition"
                aria-label="Access requests"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path
                    d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M10 17a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                {requests.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-[11px] font-bold text-black">
                    {requests.length}
                  </span>
                )}
              </button>

              {requestsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl z-20">
                  <div className="px-4 py-3 border-b border-zinc-800">
                    <p className="text-sm font-semibold">Access requests</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {requests.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-zinc-500 text-center">
                        No pending requests.
                      </p>
                    ) : (
                      requests.map((r) => (
                        <div key={r.id} className="px-4 py-3 border-b border-zinc-900 last:border-b-0">
                          <p className="text-sm text-white">
                            <span className="font-medium">{r.requester?.full_name ?? 'A learner'}</span>{' '}
                            wants into <span className="font-medium">{r.module?.title ?? 'a module'}</span>
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {new Date(r.requested_at).toLocaleDateString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <button
                              disabled={resolvingId === r.id}
                              onClick={() => handleResolve(r.id, 'approve')}
                              className="text-xs font-semibold bg-emerald-400 text-black px-3 py-1 rounded-full hover:bg-emerald-300 transition disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              disabled={resolvingId === r.id}
                              onClick={() => handleResolve(r.id, 'deny')}
                              className="text-xs font-semibold border border-zinc-700 text-zinc-300 px-3 py-1 rounded-full hover:border-zinc-500 transition disabled:opacity-50"
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <Link
              href="/dashboard"
              className="text-sm text-zinc-400 hover:text-white transition"
            >
              ← My Dashboard
            </Link>
            <Link
              href="/creator/analytics"
              className="text-sm text-cyan-400 hover:text-cyan-300 transition"
            >
              Analytics →
            </Link>
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
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p className="text-zinc-500 text-sm mb-1">Modules</p>
            <p className="text-3xl font-bold">{stats.modules}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p className="text-zinc-500 text-sm mb-1">Learners</p>
            <p className="text-3xl font-bold">{stats.learners}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p className="text-zinc-500 text-sm mb-1">Access Codes</p>
            <p className="text-3xl font-bold">{stats.access_codes}</p>
          </div>
        </div>

        {/* Modules Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Your Modules</h2>
            <Link
              href="/creator/modules/new"
              className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-zinc-200 transition"
            >
              + New Module
            </Link>
          </div>

          {modules.length === 0 ? (
            <div className="border border-dashed border-zinc-800 rounded-xl p-10 text-center">
              <p className="text-zinc-500">Your channel is quiet for now.</p>
              <p className="text-zinc-600 text-sm mt-2">Create your first module and it comes alive.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {modules.map((mod) => (
                <div
                  key={mod.id}
                  className="border border-zinc-800 bg-zinc-900 rounded-xl p-5 flex items-center justify-between hover:border-zinc-600 transition"
                >
                  <div>
                    <p className="font-semibold">{mod.title}</p>
                    <p className="text-zinc-500 text-sm mt-0.5">{mod.description}</p>
                    <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${mod.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-700 text-zinc-400'}`}>
                      {mod.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <Link
                    href={`/creator/modules/${mod.id}`}
                    className="text-sm text-cyan-400 hover:text-cyan-300 transition ml-4 shrink-0"
                  >
                    Manage →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}