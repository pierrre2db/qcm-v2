import { useState } from 'react'
import { getAvatarUrl, getInitials } from '../lib/avatars'

function PodiumSlot({ player, rank, height, borderColor, bgColor, textColor, crown }) {
  const nom = player?.prenom || player?.username || '?'
  const [imgOk, setImgOk] = useState(true)
  const avatarSize = rank === 1 ? 'w-20 h-20' : 'w-16 h-16'

  return (
    <div className="flex flex-col items-center space-y-3" style={{ width: rank === 1 ? 136 : 104 }}>
      <div className="h-8 flex items-center justify-center">
        {crown && <div className="text-amber-400 text-3xl animate-bounce">👑</div>}
      </div>

      <div className={`${avatarSize} rounded-full overflow-hidden border-4 ${borderColor} shadow-xl`}>
        {player && imgOk ? (
          <img
            src={getAvatarUrl(nom, player.styleAvatar)}
            alt={getInitials(nom)}
            onError={() => setImgOk(false)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full ${bgColor} flex items-center justify-center font-black text-xl ${textColor}`}>
            {player ? nom.charAt(0).toUpperCase() : '--'}
          </div>
        )}
      </div>

      <div className="text-center space-y-0.5">
        <p className={`font-bold truncate max-w-[100px] ${textColor} ${rank === 1 ? 'font-black text-base' : 'text-sm'}`}>
          {player ? nom : '--'}
        </p>
        <p className={`text-xs font-bold ${rank === 1 ? 'text-amber-300' : 'text-slate-400'}`}>
          {player ? `${player.score ?? 0} pts` : '--'}
        </p>
        {player && (player.tempsPasse || player.timeSpent) && (
          <p className="text-[10px] text-white/35">{player.tempsPasse || player.timeSpent}</p>
        )}
      </div>

      <div
        className={`${height} w-full rounded-t-2xl flex items-center justify-center shadow-lg`}
        style={rank === 1 ? { background: 'linear-gradient(to top, #d97706, #fbbf24)' } : { background: rank === 2 ? '#334155' : '#44403c' }}
      >
        <span className={`font-black ${rank === 1 ? 'text-4xl text-amber-950' : 'text-3xl text-white/70'}`}>{rank}</span>
      </div>
    </div>
  )
}

export function ScreenPodium({ players, onBack, onClose }) {
  const sorted = [...players].sort((a, b) => {
    if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0)
    return (a.tempsPasse || a.timeSpent || '99:99').localeCompare(b.tempsPasse || b.timeSpent || '99:99')
  })
  const [p1, p2, p3] = [sorted[0], sorted[1], sorted[2]]

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-white">
      <div className="max-w-3xl w-full text-center space-y-6 animate-fade-up">
        <div className="space-y-2">
          <span className="bg-amber-500 text-slate-950 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider">Résultats Officiels</span>
          <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400">
            Le Grand Podium de la Classe !
          </h2>
          <p className="text-slate-400 text-sm">Félicitations à l'ensemble des participants.</p>
        </div>

        <div className="flex items-end justify-center gap-3 md:gap-8 pt-4 pb-6 px-4">
          <PodiumSlot player={p2} rank={2} height="h-28" borderColor="border-slate-400" bgColor="bg-slate-700" textColor="text-slate-200" />
          <PodiumSlot player={p1} rank={1} height="h-36" borderColor="border-amber-400" bgColor="bg-amber-950" textColor="text-amber-300" crown />
          <PodiumSlot player={p3} rank={3} height="h-20" borderColor="border-amber-700" bgColor="bg-stone-700" textColor="text-amber-500" />
        </div>

        {sorted.length > 3 && (
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl px-6 py-4 space-y-2 max-w-xs mx-auto">
            {sorted.slice(3).map((p, i) => (
              <div key={p.idUtilisateur || i} className="flex justify-between text-sm text-slate-300">
                <span className="font-bold">{i + 4}. {p.prenom || p.username || '?'}</span>
                <span className="text-slate-400">{p.score ?? 0} pts</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center gap-3">
          <button onClick={onBack} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-2xl text-sm transition border border-white/10">
            Retour au Dashboard
          </button>
          <button onClick={onClose} className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-6 rounded-2xl text-sm transition shadow-lg shadow-rose-900/40">
            Fermer le Salon
          </button>
        </div>
      </div>
    </div>
  )
}
