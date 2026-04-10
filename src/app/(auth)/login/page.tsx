'use client'

// ============================================================
// SECTION: Imports
// ============================================================
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ============================================================
// SECTION: Component
// ============================================================
export default function LoginPage() {

  // ----------------------------------------------------------
  // BLOCK: Hooks
  // ----------------------------------------------------------
  const router = useRouter()
  const supabase = createClient()

  // ----------------------------------------------------------
  // BLOCK: State
  // ----------------------------------------------------------
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ----------------------------------------------------------
  // BLOCK: Handlers
  // ----------------------------------------------------------
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Let dashboard handle role-based redirect
    router.push('/dashboard')
  }

  // ----------------------------------------------------------
  // BLOCK: Render
  // ----------------------------------------------------------
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* BLOCK: Header */}
        <h1 className="text-3xl font-bold text-white mb-2">REVEE</h1>
        <p className="text-zinc-400 mb-8">Review. Ready. Pass.</p>

        {/* BLOCK: Form */}
        <form onSubmit={handleLogin} className="space-y-4">

          {/* BLOCK: Field - Email */}
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-zinc-900 text-white border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:border-white"
            />
          </div>

          {/* BLOCK: Field - Password */}
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-zinc-900 text-white border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:border-white"
            />
          </div>

          {/* BLOCK: Error Message */}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* BLOCK: Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold rounded-lg px-4 py-3 hover:bg-zinc-200 transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

        </form>

        {/* BLOCK: Footer - Signup Link */}
        <p className="text-zinc-500 text-sm mt-6 text-center">
          Don't have an account?{' '}
          <Link href="/signup" className="text-white hover:underline">
            Sign up
          </Link>
        </p>

      </div>
    </div>
  )
}