export function ScreenWaiting({ estCorrect, indice, total }) {
  const estDerniere = indice >= total - 1
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      {/* Résultat de la réponse */}
      <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg
        ${estCorrect ? 'bg-emerald-100' : 'bg-rose-100'}`}>
        {estCorrect ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>

      <div className="text-center space-y-2">
        <h2 className={`text-2xl font-extrabold ${estCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
          {estCorrect ? 'Bonne réponse !' : 'Mauvaise réponse'}
        </h2>
        {!estDerniere && (
          <>
            <p className="text-slate-500 text-sm">
              Question {indice + 1} / {total} terminée
            </p>
            <p className="text-slate-400 text-xs">En attente de la prochaine question...</p>
          </>
        )}
        {estDerniere && (
          <p className="text-slate-500 text-sm">En attente des résultats finaux...</p>
        )}
      </div>

      {!estDerniere && (
        <div className="flex items-center space-x-2 text-slate-400">
          <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}

      {/* Mini progression */}
      <div className="w-full max-w-xs space-y-1">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Progression</span>
          <span>{indice + 1} / {total}</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${((indice + 1) / total) * 100}%` }} />
        </div>
      </div>
    </div>
  )
}
