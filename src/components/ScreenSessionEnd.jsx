import { useEffect, useState } from 'react'

export function ScreenSessionEnd({ onComplete }) {
  const [remaining, setRemaining] = useState(15)

  useEffect(() => {
    if (remaining <= 0) { onComplete(); return }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining])

  const pct = (remaining / 15) * 100

  return (
    <div className="fixed inset-0 bg-[#E21B3C] flex flex-col items-center justify-center text-white z-50 select-none">
      <div className="text-7xl mb-6 animate-bounce">🏁</div>
      <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight">Session terminée</h1>
      <p className="text-white/60 text-base mb-10">Résultats dans…</p>
      <div className="text-8xl md:text-9xl font-black mb-10 tabular-nums">{remaining}</div>
      <div className="w-64 h-2 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
