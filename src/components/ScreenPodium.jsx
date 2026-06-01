export function ScreenPodium({ players, onBack, onClose }) {
  const sorted = [...players].sort((a, b) => {
    if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0)
    return (a.tempsPasse || a.timeSpent || '99:99').localeCompare(b.tempsPasse || b.timeSpent || '99:99')
  })
  const [p1, p2, p3] = [sorted[0], sorted[1], sorted[2]]

  function Slot({ player, rank, height, borderColor, bgColor, textColor, crown }) {
    const nom = player?.prenom || player?.username || '?'
    const temps = player?.tempsPasse || player?.timeSpent || '--'
    return (
      <div className="flex flex-col items-center space-y-3 w-28 md:w-36">
        {crown && <div className="text-amber-400 text-2xl animate-bounce">👑</div>}
        <div className={`${rank === 1 ? 'w-20 h-20' : 'w-16 h-16'} rounded-full border-4 ${borderColor} ${bgColor} flex items-center justify-center text-lg font-bold shadow-lg`}>
          {player ? nom.charAt(0).toUpperCase() : '--'}
        </div>
        <div className="text-center">
          <p className={`font-bold text-sm ${textColor} truncate max-w-full ${rank === 1 ? 'font-black text-base' : ''}`}>{player ? nom : '--'}</p>
          <p className={`text-xs ${rank === 1 ? 'font-bold text-amber-100' : 'text-slate-400'}`}>
            {player ? `${player.score ?? 0} pts (${temps})` : '--'}
          </p>
        </div>
        <div className={`${height} w-full rounded-t-2xl flex items-center justify-center shadow-lg`} style={rank === 1 ? { background: 'linear-gradient(to top, #d97706, #f59e0b)' } : {}}>
          <span className={`text-${rank === 1 ? '4' : '3'}xl font-black ${rank === 1 ? 'text-slate-950' : rank === 2 ? 'text-slate-800' : 'text-amber-950'}`}>{rank}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-white">
      <div className="max-w-3xl w-full text-center space-y-8">
        <div className="space-y-2">
          <span className="bg-amber-500 text-slate-950 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider">Résultats Officiels</span>
          <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400">
            Le Grand Podium de la Classe !
          </h2>
          <p className="text-slate-400 text-sm">Félicitations à l'ensemble des participants.</p>
        </div>

        <div className="flex items-end justify-center gap-4 pt-16 pb-8 px-4">
          <Slot player={p2} rank={2} height="h-28" borderColor="border-slate-300" bgColor="bg-slate-800" textColor="text-slate-200" />
          <Slot player={p1} rank={1} height="h-36" borderColor="border-amber-400" bgColor="bg-amber-950" textColor="text-amber-300" crown />
          <Slot player={p3} rank={3} height="h-20" borderColor="border-amber-700" bgColor="bg-slate-800" textColor="text-amber-600" />
        </div>

        {sorted.length > 3 && (
          <div className="bg-slate-900/80 rounded-2xl px-6 py-4 space-y-2 max-w-sm mx-auto">
            {sorted.slice(3).map((p, i) => (
              <div key={p.idUtilisateur || i} className="flex justify-between text-sm text-slate-300">
                <span className="font-bold">{i + 4}. {p.prenom || p.username || '?'}</span>
                <span className="text-slate-400">{p.score ?? 0} pts</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center space-x-4">
          <button onClick={onBack} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-2xl text-sm transition">
            Retour au Dashboard
          </button>
          <button onClick={onClose} className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-6 rounded-2xl text-sm transition shadow-lg">
            Fermer le Salon
          </button>
        </div>
      </div>
    </div>
  )
}
