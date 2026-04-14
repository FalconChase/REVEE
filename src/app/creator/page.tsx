'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type User = {
  id: string
  email: string
  full_name: string
  role: string
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

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error || !userData || userData.role !== 'creator') {
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

      setLoading(false)
    }

    loadData()
  }, [])

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
            <h1 className="text-3xl font-bold">Creator Dashboard</h1>
            <p className="text-zinc-400 mt-1">Welcome back, {user?.full_name} 🦅</p>
          </div>
          <div className="flex items-center gap-4">
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
            <button className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-zinc-200 transition">
              + New Module
            </button>
          </div>

          {modules.length === 0 ? (
            <div className="border border-zinc-800 rounded-xl p-10 text-center">
              <p className="text-zinc-500">No modules yet.</p>
              <p className="text-zinc-600 text-sm mt-2">Create your first module to get started.</p>
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