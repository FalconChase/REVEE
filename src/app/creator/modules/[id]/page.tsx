'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { generateAccessCode, getCreatorModuleStats, QUIZ_MODE_CONFIG } from '@/lib/supabase-quiz'

type Tab = 'codes' | 'learners' | 'scores'

export default function CreatorModulePage() {
  const router = useRouter()
  const params = useParams()
  const moduleId = params.id as string

  const [tab, setTab] = useState<Tab>('codes')
  const [stats, setStats] = useState<{ codes: any[]; enrollments: any[]; results: any[] } | null>(null)
  const [moduleName, setModuleName] = useState('')
  const [loading, setLoading] = useState(true)

  const [genLabel, setGenLabel] = useState('')
  const [genMaxUses, setGenMaxUses] = useState<number | ''>('')
  const [genExpiry, setGenExpiry] = useState('')
  const [generating, setGenerating] = useState(false)
  const [newCode, setNewCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('users').select('role').eq('id', user.id).single()

      if (profile?.role !== 'creator') { router.push('/dashboard'); return }

      const { data: mod } = await supabase
        .from('modules').select('title').eq('id', moduleId).single()

      setModuleName(mod?.title ?? 'Module')

      const data = await getCreatorModuleStats(moduleId)
      setStats(data)
      setLoading(false)
    }
    load()
  }, [moduleId, router])

  async function handleGenerate() {
    setGenerating(true)
    setNewCode(null)
    const result = await generateAccessCode({
      moduleId,
      label: genLabel || undefined,
      maxUses: genMaxUses !== '' ? Number(genMaxUses) : undefined,
      expiresAt: genExpiry || undefined,
    })
    if (result?.code) {
      setNewCode(result.code)
      const data = await getCreatorModuleStats(moduleId)
      setStats(data)
    }
    setGenerating(false)
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    )
  }

  const totalEnrolled = stats?.enrollments.length ?? 0
  const avgScore = stats?.results.length
    ? Math.round(stats.results.reduce((s: number, r: any) => s + r.percentage, 0) / stats.results.length)
    : null
  const passRate = stats?.results.length
    ? Math.round((stats.results.filter((r: any) => r.percentage >= 70).length / stats.results.length) * 100)
    : null

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-4xl mx-auto">

        <div className="mb-2">
          <Link href="/creator" className="text-zinc-500 hover:text-white text-sm transition">
            ← Creator Dashboard
          </Link>
        </div>
        <div className="mb-10">
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">Managing Module</p>
          <h1 className="text-3xl font-bold">{moduleName}</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Enrolled', value: totalEnrolled.toString() },
            { label: 'Attempts', value: (stats?.results.length ?? 0).toString() },
            { label: 'Avg Score', value: avgScore !== null ? `${avgScore}%` : '—' },
            { label: 'Pass Rate', value: passRate !== null ? `${passRate}%` : '—' },
          ].map((s) => (
            <div key={s.label} className="border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex border-b border-zinc-800 mb-8">
          {(['codes', 'learners', 'scores'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-sm capitalize transition ${
                tab === t ? 'border-b-2 border-white text-white' : 'text-zinc-500 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'codes' && (
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-6">
                Generate New Code
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-2">Label (optional)</label>
                  <input
                    type="text" value={genLabel}
                    onChange={(e) => setGenLabel(e.target.value)}
                    placeholder="e.g. Batch 2025-A"
                    className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-zinc-500 placeholder:text-zinc-700 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-2">Max Uses (blank = unlimited)</label>
                  <input
                    type="number" value={genMaxUses} min={1}
                    onChange={(e) => setGenMaxUses(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 30"
                    className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-zinc-500 placeholder:text-zinc-700 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-2">Expiry Date (optional)</label>
                  <input
                    type="date" value={genExpiry}
                    onChange={(e) => setGenExpiry(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-zinc-500 transition"
                  />
                </div>
                <button
                  onClick={handleGenerate} disabled={generating}
                  className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-200 transition disabled:opacity-40"
                >
                  {generating ? 'Generating...' : '+ Generate Code'}
                </button>
              </div>

              {newCode && (
                <div className="mt-6 border border-zinc-700 rounded-xl p-5 bg-zinc-900">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">New Code</p>
                  <div className="flex items-center gap-3">
                    <code className="text-white text-xl font-bold tracking-[0.3em] font-mono flex-1">
                      {newCode}
                    </code>
                    <button
                      onClick={() => copyCode(newCode)}
                      className="border border-zinc-700 text-zinc-400 hover:text-white text-xs px-3 py-2 rounded transition"
                    >
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-6">
                All Codes ({stats?.codes.length ?? 0})
              </h2>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {!stats?.codes.length && (
                  <p className="text-zinc-600 text-sm">No codes generated yet.</p>
                )}
                {stats?.codes.map((c: any) => (
                  <div
                    key={c.id}
                    className={`border rounded-lg px-4 py-3 flex items-center gap-3 ${
                      c.is_active ? 'border-zinc-800' : 'border-zinc-900 opacity-50'
                    }`}
                  >
                    <code className="text-white font-bold text-sm tracking-wider font-mono flex-1">
                      {c.code}
                    </code>
                    <span className="text-zinc-600 text-xs">{c.use_count ?? 0}/{c.max_uses ?? '∞'}</span>
                    {c.label && (
                      <span className="text-zinc-600 text-xs hidden md:block truncate max-w-[80px]">
                        {c.label}
                      </span>
                    )}
                    <button
                      onClick={() => copyCode(c.code)}
                      className="text-zinc-600 hover:text-white text-xs transition"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'learners' && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-6">
              Enrolled Learners ({stats?.enrollments.length ?? 0})
            </h2>
            {!stats?.enrollments.length ? (
              <p className="text-zinc-600 text-sm">No learners enrolled yet.</p>
            ) : (
              <div className="space-y-2">
                {stats.enrollments.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-4 border border-zinc-800 rounded-lg px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{e.users?.full_name ?? '—'}</p>
                      <p className="text-zinc-500 text-xs truncate">{e.users?.email ?? '—'}</p>
                    </div>
                    <span className="text-zinc-600 text-xs whitespace-nowrap">
                      {new Date(e.enrolled_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'scores' && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-6">
              All Results ({stats?.results.length ?? 0})
            </h2>
            {!stats?.results.length ? (
              <p className="text-zinc-600 text-sm">No results yet.</p>
            ) : (
              <div className="space-y-2">
                {stats.results.map((r: any) => {
                  const passed = r.percentage >= 70
                  return (
                    <div key={r.id} className="flex items-center gap-4 border border-zinc-800 rounded-lg px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        passed ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                      }`}>
                        {r.percentage}%
                      </span>
                      <span className="text-zinc-400 text-sm flex-1">
                        {QUIZ_MODE_CONFIG[r.quiz_mode as keyof typeof QUIZ_MODE_CONFIG]?.label ?? r.quiz_mode}
                      </span>
                      <span className="text-zinc-600 text-xs">
                        {new Date(r.taken_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}