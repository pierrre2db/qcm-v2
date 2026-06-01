export function ScreenLobby({ prenom, codeS, joueurs }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-fade-in">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">En attente du lancement...</h2>
        <p className="text-slate-500 text-sm">Le professeur va bientôt lancer la partie !</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 md:p-8 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Connecté en tant que</p>
            <p className="text-lg font-extrabold text-slate-900">{prenom}</p>
          </div>
          <div className="bg-slate-900 text-emerald-400 px-4 py-2 rounded-xl">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Code</p>
            <p className="text-xl font-black tracking-widest">{codeS}</p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Joueurs connectés</p>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {joueurs.length}
            </span>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
            {joueurs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">Aucun joueur pour l'instant...</p>
            ) : (
              joueurs.map((j, i) => (
                <div key={j.idUtilisateur || i} className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-sm font-semibold text-slate-700">{j.prenom || j.username}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center max-w-xs">
        Ne fermez pas cette page. La partie démarrera automatiquement dès que le professeur lancera la session.
      </p>
    </div>
  )
}
