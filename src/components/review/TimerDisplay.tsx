'use client'

// Countdown display used inside the top bar of a timed quiz session.
// Extracted as-is from the old materials-engineering quiz page.

export default function TimerDisplay({ seconds }: { seconds: number }) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const urgent = seconds < 300
  const pad = (n: number) => n.toString().padStart(2, '0')
  return (
    <span className={`font-mono font-bold tabular-nums ${urgent ? 'text-red-400' : 'text-white'}`}>
      {h > 0 && `${pad(h)}:`}{pad(m)}:{pad(s)}
    </span>
  )
}
