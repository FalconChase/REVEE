'use client'

// ============================================================
// SECTION: Imports
// ============================================================
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

// ============================================================
// SECTION: Helpers
// ============================================================
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ============================================================
// SECTION: Component
// ============================================================
export default function NewModulePage() {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'hidden'>('public')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const cleanSlug = slugify(slug)
    if (!title.trim() || !cleanSlug) {
      setError('Title and slug are both required.')
      return
    }

    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data, error: insertError } = await supabase
      .from('modules')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        slug: cleanSlug,
        visibility,
        created_by: user.id,
      })
      .select('id')
      .single()

    setSaving(false)

    if (insertError) {
      setError(
        insertError.code === '23505'
          ? 'That slug is already taken — try a different one.'
          : insertError.message
      )
      return
    }

    router.push(`/creator/modules/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-lg mx-auto">
        <Link
          href="/creator"
          className="text-sm text-zinc-400 hover:text-white transition"
        >
          ← Creator Studio
        </Link>

        <h1 className="text-3xl font-bold mt-4 mb-1">New module</h1>
        <p className="text-zinc-500 mb-8">
          Give it a name and a slug. You can add topics and questions once it&apos;s created.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              placeholder="e.g. Civil Engineering Board Exam"
              className="w-full bg-zinc-900 text-white border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value)
              }}
              required
              placeholder="civil-engineering-board-exam"
              className="w-full bg-zinc-900 text-white border border-zinc-700 rounded-lg px-4 py-3 font-mono text-sm focus:outline-none focus:border-emerald-400"
            />
            <p className="text-xs text-zinc-600 mt-1">
              Shows up in the URL: /modules/{slug || 'your-slug'}
            </p>
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What learners will get out of this module"
              className="w-full bg-zinc-900 text-white border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-400 resize-none"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Visibility</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`flex-1 rounded-lg border px-4 py-3 text-left transition ${
                  visibility === 'public'
                    ? 'border-emerald-400/50 bg-emerald-400/10'
                    : 'border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <p className="text-sm font-medium">Public</p>
                <p className="text-xs text-zinc-500 mt-0.5">Listed for anyone to discover and request access</p>
              </button>
              <button
                type="button"
                onClick={() => setVisibility('hidden')}
                className={`flex-1 rounded-lg border px-4 py-3 text-left transition ${
                  visibility === 'hidden'
                    ? 'border-emerald-400/50 bg-emerald-400/10'
                    : 'border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <p className="text-sm font-medium">Hidden</p>
                <p className="text-xs text-zinc-500 mt-0.5">Only reachable by access code you share</p>
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-400 text-black font-semibold rounded-lg px-4 py-3 hover:bg-emerald-300 transition disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create module'}
          </button>
        </form>
      </div>
    </div>
  )
}
