export function ScreenPodium({ players, onBack, onClose }) {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.timeSpent.localeCompare(b.timeSpent))
  const [p1, p2, p3] = [sorted[0], sorted[1], sorted[2]]

  function Slot({ player, rank, height, borderColor, bgColor, textColor, crown }) {
    return (
      <div className="flex flex-col items-center space-y-3 w-28 md:w-36">
        {crown && <div className="text-amber-400 text-2xl animate-bounce">👑</div>}
        <div className={`w-16 h-16 rounded-full border-4 ${borderColor} ${bgColor} flex items-center justify-center text-lg font-bold shadow-lg ${rank === 1 ? 'w-20 h-20' : ''}`}>
          {player ? player.username.charAt(0).toUpperCase() : '--'}
        </div>
        <div className="text-center">
          <p className={`font-bold text-sm ${textColor} truncate max-w-full ${rank === 1 ? 'font-black text-base' : ''}`}>{player?.username ?? '--'}</p>
          <p className={`text-xs ${rank === 1 ? 'font-bold text-amber-100' : 'text-slate-400'}`}>{player ? `${player.score}/10 (${player.timeSpent})` : '--'}</p>
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
