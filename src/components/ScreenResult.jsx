export function ScreenResult({ username, score, totalQuestions, timeSpent, groups, onRestart, onReview }) {
  const group = groups.find(g => score <= g.maxScore) || groups[groups.length - 1]

  const colorMap = {
    red: { border: '#ef4444', badge: 'bg-rose-100 text-rose-800' },
    amber: { border: '#f59e0b', badge: 'bg-amber-100 text-amber-800' },
    green: { border: '#10b981', badge: 'bg-emerald-100 text-emerald-800' },
  }
  const colors = colorMap[group.color] || colorMap.green
  const percentage = Math.round((score / totalQuestions) * 100)

  const feedbackLines = group.feedback.split('\n\n')

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">Évaluation Terminée</span>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Merci, <span className="text-emerald-600">{username}</span> !
        </h2>
        <p className="text-slate-500 text-sm">Voici l'analyse de votre performance sanitaire.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Score circle */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 md:col-span-5 flex flex-col items-center justify-center text-center space-y-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Votre Note Globale</span>
          <div className="relative w-36 h-36 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full border-8"
              style={{ borderColor: colors.border }}
            />
            <div className="text-center">
              <span className="text-4xl font-extrabold text-slate-800">{score}</span>
              <span className="text-slate-400 block text-sm font-semibold mt-0.5">/ {totalQuestions}</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase inline-block ${colors.badge}`}>{group.label}</span>
            <h4 className="font-extrabold text-slate-800 text-lg">{group.title}</h4>
          </div>
        </div>

        {/* Feedback */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 md:col-span-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>Évaluation du Formateur</span>
            </h3>
            <div className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              {feedbackLines.map((line, i) => (
                <p key={i}>{i === 0 ? <><strong>{username}</strong>, {line.replace(/^[^,]+,\s*/, '')}</> : <em>{line}</em>}</p>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <span className="block text-xs text-slate-400 font-medium">Temps passé</span>
              <span className="text-lg font-bold text-slate-700">{timeSpent}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <span className="block text-xs text-slate-400 font-medium">Réussite</span>
              <span className="text-lg font-bold text-slate-700">{percentage}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={onRestart} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl transition shadow-md flex items-center justify-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 19.62M9 17H5v-4" />
              </svg>
              <span>Recommencer</span>
            </button>
            <button onClick={onReview} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-xl transition flex items-center justify-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Revoir les réponses</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
