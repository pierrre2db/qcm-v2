import { useEffect, useState } from 'react'
import { Md } from './Md'

const DUREE_QUESTION = 30

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

  const pctTimer = secondesRestantes / DUREE_QUESTION
  const timerStrokeColor = secondesRestantes > 15 ? '#4ade80' : secondesRestantes > 8 ? '#fbbf24' : '#f87171'
  const RADIUS = 36
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS

  return (
    <div className="space-y-4">

      {/* Timer + progression */}
      <div className="flex items-center gap-4">
        {/* Circular timer */}
        <div className="relative shrink-0 flex items-center justify-center" style={{ width: 88, height: 88 }}>
          <svg width="88" height="88" className="-rotate-90">
            {/* Track */}
            <circle cx="44" cy="44" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="7" />
            {/* Progress */}
            <circle
              cx="44" cy="44" r={RADIUS}
              fill="none"
              stroke={timerStrokeColor}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - pctTimer)}
              style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.5s' }}
            />
          </svg>
          <span className={`absolute font-black text-xl text-white ${secondesRestantes <= 8 ? 'animate-pulse' : ''}`}>
            {secondesRestantes}
          </span>
        </div>

        {/* Question progress */}
        <div className="flex-1 space-y-1.5">
          <span className="text-white/70 text-xs font-bold uppercase tracking-widest">
            Question {indice + 1} / {total}
          </span>
          <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
            <div className="bg-white/60 h-full transition-all duration-500 rounded-full"
              style={{ width: `${((indice + 1) / total) * 100}%` }} />
          </div>
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
        {question.imageUrl && (
          <div className="border-b border-slate-100 bg-slate-50 flex justify-center overflow-hidden">
            <img
              src={question.imageUrl}
              alt="Illustration"
              className="max-h-48 w-full object-contain"
            />
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
