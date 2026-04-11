'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { enrollWithCode } from '@/lib/supabase-quiz'

export default function EnrollPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [enrolledModule, setEnrolledModule] = useState<{ id: string; name: string } | null>(null)

  function formatCode(raw: string) {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (clean.length <= 4) return clean
    return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.replace('-', '').length < 8) {
      setStatus('error')
      setMessage('Please enter a complete 8-character access code.')
      return
    }

    setStatus('loading')
    setMessage('')

    const result = await enrollWithCode(code)

    if (result.success) {
      setStatus('success')
      setEnrolledModule({ id: result.moduleId!, name: result.moduleName! })
    } else {
      setStatus('error')
      setMessage(result.error ?? 'Something went wrong.')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-md mx-auto">

        {/* Back */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-zinc-500 hover:text-white text-sm transition">
            ← Dashboard
          </Link>
        </div>

        {status === 'success' && enrolledModule ? (
          // Success state
          <div className="text-center py-10">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-2">Enrolled!</h2>
            <p className="text-zinc-500 mb-1 text-sm">You now have access to:</p>
            <p className="text-white font-semibold mb-8">{enrolledModule.name}</p>
            <button
              onClick={() => router.push('/modules/materials-engineering')}
              className="bg-white text-black font-semibold px-8 py-3 rounded-lg hover:bg-zinc-200 transition"
            >
              Start Studying →
            </button>
          </div>
        ) : (
          // Input state
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-2">Enter Access Code</h1>
              <p className="text-zinc-500 text-sm">
                Get a code from your instructor to unlock a module.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-3">
                  Access Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(formatCode(e.target.value))}
                  placeholder="XXXX-XXXX"
                  maxLength={9}
                  autoFocus
                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-center text-2xl font-bold tracking-[0.4em] px-6 py-5 rounded-lg focus:outline-none focus:border-zinc-500 placeholder:text-zinc-700 placeholder:tracking-widest transition font-mono"
                />
              </div>

              {status === 'error' && message && (
                <p className="text-red-400 text-sm">{message}</p>
              )}

              <button
                type="submit"
                disabled={status === 'loading' || code.replace('-', '').length < 8}
                className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? 'Verifying...' : 'Unlock Module →'}
              </button>
            </form>

            <p className="text-center text-zinc-700 text-xs mt-8">
              Codes are case-insensitive. Contact your instructor if you have trouble.
            </p>
          </>
        )}
      </div>
    </div>
  )
}