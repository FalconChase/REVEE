'use client'

// ============================================================
// SECTION: Imports
// ============================================================
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

// ============================================================
// SECTION: Types
// ============================================================
type PublicModule = {
  id: string
  slug: string
  title: string
  description: string | null
}

// ============================================================
// SECTION: Icons (inline, no deps)
// ============================================================
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-emerald-400">
      <path
        d="M12 4v11M12 4l-3.5 3.5M12 4l3.5 3.5M6 14v3a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ModesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-emerald-400">
      <path
        d="M4 6h16M4 12h10M4 18h13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="19" cy="18" r="1.6" fill="currentColor" />
    </svg>
  )
}

function TrackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-emerald-400">
      <path
        d="M4 19V9M11 19V5M18 19v-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ============================================================
// SECTION: Component
// ============================================================
export default function Home() {
  const [modules, setModules] = useState<PublicModule[]>([])
  const [loadingModules, setLoadingModules] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function loadModules() {
      const { data } = await supabase
        .from('modules')
        .select('id, slug, title, description')
        .eq('status', 'active')
        .eq('visibility', 'public')
        .order('title', { ascending: true })

      setModules((data as PublicModule[]) ?? [])
      setLoadingModules(false)
    }

    loadModules()
  }, [])

  return (
    <div className="relative flex flex-col flex-1 overflow-hidden bg-black text-white">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px]"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(16,185,129,0.16) 0%, rgba(16,185,129,0.05) 40%, rgba(0,0,0,0) 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 70% 50% at 50% 0%, black 40%, transparent 100%)',
        }}
      />

      {/* Nav */}
      <header className="sticky top-0 z-10 w-full border-b border-white/10 bg-black/70 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
          <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-400 text-xs font-bold text-black">
              R
            </span>
            REVEE
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-emerald-300"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto flex w-full max-w-5xl flex-col items-start gap-6 px-6 py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            A community of learners
          </span>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Review. Ready.{' '}
            <span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
              Pass.
            </span>
          </h1>
          <p className="max-w-xl text-lg leading-8 text-zinc-400">
            REVEE is a two-sided platform. Become a creator and share your expertise by
            building a review module, or become a reviewee and learn from it —
            across any field, not just one exam.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="flex h-12 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-black shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_8px_24px_-8px_rgba(16,185,129,0.6)] transition-colors hover:bg-emerald-300"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-medium text-white transition-colors hover:border-white/30 hover:bg-white/5"
            >
              I already have an account
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-white/10">
          <div className="mx-auto w-full max-w-5xl px-6 py-16">
            <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
              How it works
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-emerald-400/30 hover:bg-white/[0.04]">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/10">
                  <ShareIcon />
                </div>
                <h3 className="mt-4 text-base font-semibold">Creators build modules</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Anyone with expertise to share can curate question banks by topic,
                  complete with explanations and review settings.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-emerald-400/30 hover:bg-white/[0.04]">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/10">
                  <ModesIcon />
                </div>
                <h3 className="mt-4 text-base font-semibold">You review your way</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Mini quizzes, standard sets, timed simulations, or fully custom
                  runs — pick the mode that fits your prep.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-emerald-400/30 hover:bg-white/[0.04]">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/10">
                  <TrackIcon />
                </div>
                <h3 className="mt-4 text-base font-semibold">Track and improve</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Every attempt is scored and logged, so you can see exactly where
                  to focus next.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Modules */}
        <section className="border-t border-white/10">
          <div className="mx-auto w-full max-w-5xl px-6 py-16">
            <h2 className="text-2xl font-semibold tracking-tight">Available modules</h2>

            {loadingModules ? (
              <p className="mt-6 text-sm text-zinc-500">Loading modules…</p>
            ) : modules.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
                <p className="text-sm text-zinc-400">
                  No modules published yet. More review sets are on the way.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {modules.map((mod) => (
                  <div
                    key={mod.id}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-emerald-400/30 hover:bg-white/[0.04]"
                  >
                    <h3 className="text-base font-semibold">{mod.title}</h3>
                    {mod.description && (
                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        {mod.description}
                      </p>
                    )}
                    <Link
                      href="/signup"
                      className="mt-4 inline-block text-sm font-medium text-emerald-300 underline underline-offset-4"
                    >
                      Sign up to start
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto w-full max-w-5xl px-6 py-8 text-sm text-zinc-500">
          © {new Date().getFullYear()} REVEE. A community of learners.
        </div>
      </footer>
    </div>
  )
}
