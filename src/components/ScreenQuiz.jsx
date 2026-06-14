import { useEffect, useState } from 'react'
import { Md } from './Md'

export function ScreenQuiz({ currentQuestion, currentIndex, totalQuestions, selectedOption, startTime, onSelect, onConfirm }) {
  const [elapsed, setElapsed] = useState('00:00')

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((new Date() - startTime) / 1000)
      const m = String(Math.floor(diff / 60)).padStart(2, '0')
      const s = String(diff % 60).padStart(2, '0')
      setElapsed(`${m}:${s}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  const progress = ((currentIndex + 1) / totalQuestions) * 100

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-md shadow-slate-200/30 space-y-2">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
          <span>Question <strong className="text-emerald-600">{currentIndex + 1} / {totalQuestions}</strong></span>
          <span className="text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{elapsed}</span>
        </div>
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 flex justify-between items-center">
          <span className="text-white/90 text-xs font-bold uppercase tracking-wider">{currentQuestion.category}</span>
          <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Solo</span>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          <h3 className="text-lg md:text-xl font-bold text-slate-900 leading-snug">
            <Md>{currentQuestion.question}</Md>
          </h3>

          {/* Image Cloudinary */}
          {currentQuestion.imageUrl && (
            <div className="flex justify-center">
              <img
                src={currentQuestion.imageUrl}
                alt=""
                className="max-h-64 w-auto rounded-2xl object-contain border border-slate-100 shadow-md"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedOption === idx
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelect(idx)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start space-x-3 group
                    ${isSelected
                      ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/10'
                      : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/10'
                    }`}
                >
                  <span className={`flex items-center justify-center w-7 h-7 rounded-lg font-bold text-sm transition-colors uppercase select-none shrink-0
                    ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700'}`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-slate-700 font-medium text-sm md:text-base pt-0.5 leading-relaxed">
                    <Md>{option}</Md>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center">
          <p className="text-xs text-slate-400 italic">Sélectionnez une réponse pour continuer.</p>
          <button
            onClick={onConfirm}
            disabled={selectedOption === null}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-md disabled:shadow-none flex items-center space-x-1.5"
          >
            <span>Valider</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
