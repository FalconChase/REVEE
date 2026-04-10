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
        <div className="mb-10">
          <h1 className="text-3xl font-bold">Welcome, {user?.full_name} 👋</h1>
          <p className="text-zinc-400 mt-1">Your REVEE learner dashboard</p>
        </div>

        {/* BLOCK: Empty State - No Modules Yet */}
        <div className="border border-zinc-800 rounded-xl p-10 text-center">
          <p className="text-zinc-500 text-lg">No modules enrolled yet.</p>
          <p className="text-zinc-600 text-sm mt-2">
            Enter an access code to get started.
          </p>
        </div>

        {/* BLOCK: Sign Out */}
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            router.push('/login')
          }}
          className="mt-8 text-zinc-500 hover:text-white text-sm transition"
        >
          Sign out
        </button>

      </div>
    </div>
  )
}