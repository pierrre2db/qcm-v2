export function ScreenWaiting({ estCorrect, indice, total }) {
  const estDerniere = indice >= total - 1

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] space-y-8 text-center">

      {/* Big result icon */}
      <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-2xl
        ${estCorrect ? 'bg-[#26890C] shadow-[#26890C]/40' : 'bg-[#E21B3C] shadow-[#E21B3C]/40'}`}>
        {estCorrect ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>

      {/* Message */}
      <div className="space-y-2">
        <h2 className="text-4xl font-black text-white tracking-tight">
          {estCorrect ? 'Bonne réponse !' : 'Pas tout à fait…'}
        </h2>
        <p className="text-white/70 text-base font-semibold">
          {estDerniere ? 'En attente des résultats finaux…' : `Question ${indice + 1} / ${total} terminée`}
        </p>
        {!estDerniere && (
          <p className="text-white/50 text-sm">La prochaine question arrive bientôt</p>
        )}
      </div>

      {/* Bouncing dots */}
      {!estDerniere && (
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-3 h-3 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}

      {/* Progress bar */}
      <div className="w-full max-w-xs space-y-2">
        <div className="flex justify-between text-xs text-white/60 font-semibold">
          <span>Progression</span>
          <span>{indice + 1} / {total}</span>
        </div>
        <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
          <div className="bg-white h-full rounded-full transition-all duration-700"
            style={{ width: `${((indice + 1) / total) * 100}%` }} />
        </div>
      </div>
    </div>
  )
}
