'use client'

// SECTION: Module landing page (generic, slug-driven)
// Replaces the old hardcoded materials-engineering/page.tsx. Resolves the
// module by its slug, gates on enrollment + deactivation, then hands off to
// the shared ModuleLanding template.

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  getTopics,
  getUserResults,
  isEnrolled,
  getModuleBySlug,
  getAccessRequestStatus,
  requestModuleAccess,
  type AccessRequestStatus,
} from '@/lib/supabase-quiz'
import type { Topic, ExamResult, Module } from '@/lib/supabase-quiz'
import ModuleLanding from '@/components/review/ModuleLanding'

export default function ModulePage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [module, setModule] = useState<Module | null | undefined>(undefined) // undefined = loading
  const [enrolled, setEnrolled] = useState<boolean | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [results, setResults] = useState<ExamResult[]>([])
  const [loading, setLoading] = useState(true)
  const [requestStatus, setRequestStatus] = useState<AccessRequestStatus>('none')
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const mod = await getModuleBySlug(slug)
      setModule(mod)
      if (!mod) { setLoading(false); return }

      const [enrolledStatus, topicsData, resultsData, accessRequestStatus] = await Promise.all([
        isEnrolled(mod.id),
        getTopics(mod.id),
        getUserResults(mod.id),
        getAccessRequestStatus(mod.id),
      ])

      setEnrolled(enrolledStatus)
      setTopics(topicsData)
      setResults(resultsData)
      setRequestStatus(accessRequestStatus)
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading || module === undefined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    )
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-4xl mb-4">🔍</p>
          <h2 className="text-xl font-bold mb-2">Module Not Found</h2>
          <p className="text-zinc-500 mb-6">This module doesn&apos;t exist or is no longer available.</p>
          <Link
            href="/dashboard"
            className="inline-block bg-white text-black font-semibold px-6 py-2 rounded-lg hover:bg-zinc-200 transition text-sm"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (module.status === 'deactivated') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-4xl mb-4">🚫</p>
          <h2 className="text-xl font-bold mb-2">Module Deactivated</h2>
          <p className="text-zinc-500 mb-6">
            {module.title} is no longer available for study. Past results still appear in your history.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-white text-black font-semibold px-6 py-2 rounded-lg hover:bg-zinc-200 transition text-sm"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!enrolled) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-xl font-bold mb-2">Access Required</h2>

          {requestStatus === 'pending' ? (
            <>
              <p className="text-zinc-500 mb-6">
                Your request to join {module.title} is waiting on the creator. You&apos;ll get
                in as soon as they approve it.
              </p>
              <span className="inline-block rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-300">
                Request pending
              </span>
            </>
          ) : (
            <>
              <p className="text-zinc-500 mb-6">
                {requestStatus === 'denied'
                  ? 'Your last request wasn’t approved. You can send another one, or use an access code if you have one.'
                  : 'Ask the creator for access, or enter a code if you already have one.'}
              </p>
              <div className="flex flex-col gap-3 items-center">
                <button
                  disabled={requesting}
                  onClick={async () => {
                    setRequesting(true)
                    const { error } = await requestModuleAccess(module.id)
                    setRequesting(false)
                    if (!error) setRequestStatus('pending')
                  }}
                  className="inline-block bg-emerald-400 text-black font-semibold px-6 py-2 rounded-lg hover:bg-emerald-300 transition text-sm disabled:opacity-50"
                >
                  {requesting ? 'Sending request…' : 'Request Access'}
                </button>
                <Link
                  href="/enroll"
                  className="text-sm text-zinc-400 hover:text-white transition"
                >
                  Have an access code instead?
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <ModuleLanding
      module={module}
      topics={topics}
      results={results}
      basePath={`/modules/${slug}`}
    />
  )
}
