import { useEffect, useState } from 'react'
import { Md } from './Md'

const DUREE_QUESTION = 60

const ANSWER_STYLES = [
  { bg: 'bg-[#E21B3C]', hover: 'hover:bg-[#c5182f] active:bg-[#a81427]', shadow: 'shadow-[#E21B3C]/40', shape: '▲', label: 'A' },
  { bg: 'bg-[#1368CE]', hover: 'hover:bg-[#1059b0] active:bg-[#0e4d98]', shadow: 'shadow-[#1368CE]/40', shape: '◆', label: 'B' },
  { bg: 'bg-[#D89E00]', hover: 'hover:bg-[#b98800] active:bg-[#9c7300]', shadow: 'shadow-[#D89E00]/40', shape: '●', label: 'C' },
  { bg: 'bg-[#26890C]', hover: 'hover:bg-[#1e6e0a] active:bg-[#185809]', shadow: 'shadow-[#26890C]/40', shape: '■', label: 'D' },
]

export function ScreenQuizLive({ question, indice, total, questionDemarreeA, onRepondre }) {
  const [selectionne, setSelectionne] = useState(null)
  const [secondesRestantes, setSecondesRestantes] = useState(DUREE_QUESTION)
  const [confirme, setConfirme] = useState(false)

  useEffect(() => {
    setSelectionne(null)
    setConfirme(false)
  }, [indice])

  useEffect(() => {
    if (!questionDemarreeA) return
    const calc = () => {
      const ecoule = Math.floor((new Date() - questionDemarreeA) / 1000)
      const restant = Math.max(0, DUREE_QUESTION - ecoule)
      setSecondesRestantes(restant)
    }
    calc()
    const interval = setInterval(calc, 500)
    return () => clearInterval(interval)
  }, [questionDemarreeA, indice])

  async function handleSelect(idx) {
    if (confirme) return
    setSelectionne(idx)
    setConfirme(true)
    await onRepondre(idx)
  }

  const pctTimer = (secondesRestantes / DUREE_QUESTION) * 100
  const timerColor = secondesRestantes > 30 ? 'bg-emerald-400' : secondesRestantes > 10 ? 'bg-amber-400' : 'bg-rose-400'
  const timerPulse = secondesRestantes <= 10 ? 'animate-pulse' : ''

  return (
    <div className="space-y-4">

      {/* Timer + progression */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-white/70 text-xs font-bold uppercase tracking-widest">
            Question {indice + 1} / {total}
          </span>
          <span className={`font-black text-2xl text-white ${secondesRestantes <= 10 ? 'animate-pulse text-rose-300' : ''}`}>
            {secondesRestantes}s
          </span>
        </div>
        {/* Overall progress */}
        <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
          <div className="bg-white/60 h-full transition-all duration-500 rounded-full"
            style={{ width: `${((indice + 1) / total) * 100}%` }} />
        </div>
        {/* Timer bar */}
        <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
          <div className={`${timerColor} ${timerPulse} h-full transition-all duration-500 rounded-full`}
            style={{ width: `${pctTimer}%` }} />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
        {question.category && (
          <div className="bg-[#3b1278] px-5 py-2 flex justify-between items-center">
            <span className="text-white/70 text-xs font-bold uppercase tracking-wider">{question.category}</span>
            <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Live</span>
          </div>
        )}
        <div className="px-6 py-5 text-center">
          <h3 className="text-lg md:text-xl font-extrabold text-slate-900 leading-snug">
            <Md>{question.question}</Md>
          </h3>
        </div>
      </div>

      {/* Answer grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.options.map((option, idx) => {
          const style = ANSWER_STYLES[idx] || ANSWER_STYLES[0]
          const estSelectionne = selectionne === idx
          const estGrise = confirme && !estSelectionne

          return (
            <button
              key={idx}
              type="button"
              disabled={confirme}
              onClick={() => handleSelect(idx)}
              className={`
                relative w-full text-left p-4 rounded-2xl shadow-lg transition-all duration-150
                flex items-center gap-3
                ${style.bg} ${!confirme ? style.hover : ''}
                ${estSelectionne ? 'ring-4 ring-white scale-[1.02] shadow-2xl' : ''}
                ${estGrise ? 'opacity-40 scale-[0.97]' : ''}
                ${!confirme ? 'active:scale-95 cursor-pointer' : 'cursor-default'}
              `}
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-black/20 text-white font-black text-base shrink-0">
                {style.shape}
              </span>
              <span className="text-white font-bold text-sm md:text-base leading-snug flex-1">
                <Md>{option}</Md>
              </span>
              {estSelectionne && (
                <span className="shrink-0 text-white text-xl">✓</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Status message */}
      {confirme && (
        <div className="text-center">
          <p className="text-white/80 text-sm font-semibold">
            ✓ Réponse enregistrée — en attente de la prochaine question
          </p>
        </div>
      )}
    </div>
  )
}
