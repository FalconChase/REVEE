'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Check role and redirect
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'creator') {
      router.push('/creator')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-2">REVEE</h1>
        <p className="text-zinc-400 mb-8">Review. Ready. Pass.</p>

        <form onSubmit={handleLogin} className="space-y-4">
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

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold rounded-lg px-4 py-3 hover:bg-zinc-200 transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

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