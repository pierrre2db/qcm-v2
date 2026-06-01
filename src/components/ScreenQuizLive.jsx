import { useEffect, useState } from 'react'

const DUREE_QUESTION = 60

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
  const couleurTimer = secondesRestantes > 30 ? 'bg-emerald-500' : secondesRestantes > 10 ? 'bg-amber-500' : 'bg-rose-500'

  return (
    <div className="space-y-6">
      {/* Barre progression + timer */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-md space-y-3">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
          <span>Question <strong className="text-emerald-600">{indice + 1} / {total}</strong></span>
          <span className={`font-black text-lg ${secondesRestantes <= 10 ? 'text-rose-500 animate-pulse' : 'text-slate-700'}`}>
            {secondesRestantes}s
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${((indice + 1) / total) * 100}%` }} />
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className={`${couleurTimer} h-full transition-all duration-500`}
              style={{ width: `${pctTimer}%` }} />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 flex justify-between items-center">
          <span className="text-white/90 text-xs font-bold uppercase tracking-wider">{question.category}</span>
          <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Live</span>
        </div>

        <div className="p-6 md:p-8 space-y-4">
          <h3 className="text-lg md:text-xl font-bold text-slate-900 leading-snug">{question.question}</h3>
          <div className="grid grid-cols-1 gap-3">
            {question.options.map((option, idx) => {
              const estSelectionne = selectionne === idx
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={confirme}
                  onClick={() => handleSelect(idx)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start space-x-3 group
                    ${estSelectionne
                      ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                      : confirme
                      ? 'border-slate-100 bg-slate-50 opacity-50 cursor-default'
                      : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 active:scale-[0.98]'
                    }`}
                >
                  <span className={`flex items-center justify-center w-7 h-7 rounded-lg font-bold text-sm transition-colors uppercase select-none shrink-0
                    ${estSelectionne ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700'}`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-slate-700 font-medium text-sm md:text-base pt-0.5 leading-relaxed">{option}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-400 italic text-center">
            {confirme ? '✓ Réponse enregistrée — en attente de la prochaine question' : 'Appuyez sur une réponse pour valider.'}
          </p>
        </div>
      </div>
    </div>
  )
}
