'use client'

// ============================================================
// SECTION: Imports
// ============================================================
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ============================================================
// SECTION: Types
// ============================================================
type User = {
  id: string
  email: string
  full_name: string
  role: string
}

// ============================================================
// SECTION: Component
// ============================================================
export default function CreatorPage() {

  // ----------------------------------------------------------
  // BLOCK: Hooks
  // ----------------------------------------------------------
  const router = useRouter()
  const supabase = createClient()

  // ----------------------------------------------------------
  // BLOCK: State
  // ----------------------------------------------------------
  const [user, setUser] = useState<User | null>(null)
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

      if (error || !data || data.role !== 'creator') {
        router.push('/dashboard')
        return
      }

      setUser(data)
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
      <div className="max-w-5xl mx-auto">

        {/* BLOCK: Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Creator Dashboard</h1>
            <p className="text-zinc-400 mt-1">Welcome back, {user?.full_name} 🦅</p>
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

        {/* BLOCK: Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-10">

          {/* BLOCK: Stat - Modules */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p className="text-zinc-500 text-sm mb-1">Modules</p>
            <p className="text-3xl font-bold">0</p>
          </div>

          {/* BLOCK: Stat - Learners */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p className="text-zinc-500 text-sm mb-1">Learners</p>
            <p className="text-3xl font-bold">0</p>
          </div>

          {/* BLOCK: Stat - Access Codes */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p className="text-zinc-500 text-sm mb-1">Access Codes</p>
            <p className="text-3xl font-bold">0</p>
          </div>

        </div>

        {/* BLOCK: Modules Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Your Modules</h2>
            <button className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-zinc-200 transition">
              + New Module
            </button>
          </div>

          {/* BLOCK: Empty State - Modules */}
          <div className="border border-zinc-800 rounded-xl p-10 text-center">
            <p className="text-zinc-500">No modules yet.</p>
            <p className="text-zinc-600 text-sm mt-2">
              Create your first module to get started.
            </p>
          </div>
        </div>

        {/* BLOCK: Recent Learners Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Learners</h2>

          {/* BLOCK: Empty State - Learners */}
          <div className="border border-zinc-800 rounded-xl p-10 text-center">
            <p className="text-zinc-500">No learners yet.</p>
            <p className="text-zinc-600 text-sm mt-2">
              Share an access code to enroll learners.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}