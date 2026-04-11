import { Suspense } from 'react'

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <p className="text-zinc-400">Loading quiz...</p>
        </div>
      }
    >
      {children}
    </Suspense>
  )
}