'use client'

// SECTION: Module landing page (generic, slug-driven)
// Replaces the old hardcoded materials-engineering/page.tsx. Resolves the
// module by its slug, gates on enrollment + deactivation, then hands off to
// the shared ModuleLanding template.

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getTopics, getUserResults, isEnrolled, getModuleBySlug } from '@/lib/supabase-quiz'
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

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const mod = await getModuleBySlug(slug)
      setModule(mod)
      if (!mod) { setLoading(false); return }

      const [enrolledStatus, topicsData, resultsData] = await Promise.all([
        isEnrolled(mod.id),
        getTopics(mod.id),
        getUserResults(mod.id),
      ])

      setEnrolled(enrolledStatus)
      setTopics(topicsData)
      setResults(resultsData)
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
          <p className="text-zinc-500 mb-6">You need an access code to unlock this module.</p>
          <Link
            href="/enroll"
            className="inline-block bg-white text-black font-semibold px-6 py-2 rounded-lg hover:bg-zinc-200 transition text-sm"
          >
            Enter Access Code
          </Link>
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
