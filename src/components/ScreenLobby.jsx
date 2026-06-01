import { useState } from 'react'
import { getAvatarUrl, getInitials } from '../lib/avatars'

function PlayerChip({ joueur }) {
  const name = joueur.prenom || joueur.username || '?'
  const style = joueur.styleAvatar
  const [imgOk, setImgOk] = useState(true)
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg ring-2 ring-white/30">
        {imgOk ? (
          <img src={getAvatarUrl(name, style)} alt={getInitials(name)} onError={() => setImgOk(false)} className="w-full h-full object-cover bg-white/10" />
        ) : (
          <div className="w-full h-full bg-white/20 flex items-center justify-center font-black text-sm text-white">{getInitials(name)}</div>
        )}
      </div>
      <span className="text-[9px] text-white/70 font-semibold max-w-[48px] truncate text-center">{name}</span>
    </div>
  )
}

export function ScreenLobby({ prenom, codeS, joueurs }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] space-y-8 text-center">

      {/* Spinner */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-white/20" />
        <div className="absolute inset-0 rounded-full border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        <div className="absolute inset-2 rounded-full bg-white/10 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
          En attente du lancement…
        </h2>
        <p className="text-white/60 text-sm font-semibold">
          Connecté en tant que <span className="text-white font-black">{prenom}</span>
        </p>
      </div>

      {/* Code card */}
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl px-8 py-5 space-y-1">
        <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Code de session</p>
        <p className="text-5xl font-black text-white tracking-widest">{codeS}</p>
      </div>

      {/* Player count + avatars */}
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-center gap-2">
          <span className="text-white/70 text-sm font-semibold">
            {joueurs.length === 0 ? 'En attente de joueurs…' : `${joueurs.length} joueur${joueurs.length > 1 ? 's' : ''} connecté${joueurs.length > 1 ? 's' : ''}`}
          </span>
          {joueurs.length > 0 && (
            <span className="bg-white/20 text-white text-xs font-black px-2.5 py-0.5 rounded-full">
              {joueurs.length}
            </span>
          )}
        </div>

        {joueurs.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3">
            {joueurs.map((j, i) => (
              <PlayerChip key={j.idUtilisateur || i} joueur={j} />
            ))}
          </div>
        )}
      </div>

      <p className="text-white/40 text-xs max-w-xs">
        Ne fermez pas cette page. La partie démarrera automatiquement.
      </p>
    </div>
  )
}
