import { useEffect, useRef } from 'react'
import QRious from 'qrious'

function escapeHtml(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function ScreenDashboard({ roomCode, players, totalQuestions, onPodium, onClose }) {
  const qrRef = useRef(null)

  useEffect(() => {
    if (!qrRef.current) return
    const url = `${window.location.href.split('?')[0]}?room=${roomCode}`
    new QRious({
      element: qrRef.current,
      value: url,
      size: 180,
      background: '#ffffff',
      foreground: '#059669',
      level: 'H'
    })
  }, [roomCode])

  async function copyLink() {
    const url = `${window.location.href.split('?')[0]}?room=${roomCode}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // fallback
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
  }

  const sorted = [...players].sort((a, b) => b.score - a.score || b.progress - a.progress)
  const completedCount = players.filter(p => p.status === 'Terminé').length
  const average = players.length > 0
    ? (players.reduce((s, p) => s + p.score, 0) / players.length).toFixed(1)
    : '--'

  return (
    <div className="space-y-8">
      {/* Session info + QR */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-7 space-y-4">
          <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Session de classe active</span>
          </div>
          <h2 className="text-3xl font-black text-slate-950">Rejoignez le concours !</h2>
          <p className="text-slate-500 text-sm">Projetez cet écran. Les élèves scannent le QR code ou entrent le code ci-dessous.</p>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-lg">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Code de Session</span>
              <span className="text-3xl font-black tracking-widest text-emerald-400">{roomCode}</span>
            </div>
            <button onClick={copyLink} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-2xl text-xs transition flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span>Copier le lien direct</span>
            </button>
          </div>
        </div>
        <div className="md:col-span-5 flex flex-col items-center justify-center p-4 border border-slate-100 bg-slate-50 rounded-2xl text-center space-y-2">
          <canvas ref={qrRef} className="rounded-xl" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scanner pour rejoindre</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Participants', value: players.length, color: 'blue' },
          { label: 'Terminés', value: `${completedCount} / ${players.length}`, color: 'emerald' },
          { label: 'Moyenne générale', value: `${average} / ${totalQuestions}`, color: 'amber' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-md flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase">{label}</span>
              <span className="text-3xl font-extrabold block text-slate-900">{value}</span>
            </div>
            <div className={`p-3 bg-${color}-50 text-${color}-600 rounded-2xl`}>
              <div className="h-6 w-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Live table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">Suivi des participants en direct</h3>
            <p className="text-xs text-slate-500">Mises à jour automatiques en temps réel.</p>
          </div>
          <button onClick={onPodium} className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-md flex items-center space-x-1.5">
            <span>Clôturer & Afficher le podium !</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          {sorted.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm space-y-2">
              <div className="animate-bounce">⏳</div>
              <p>En attente de connexion des premiers participants...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100/70 text-slate-600 font-bold text-xs uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Pseudo</th>
                  <th className="px-6 py-3.5">Avancement</th>
                  <th className="px-6 py-3.5">Score</th>
                  <th className="px-6 py-3.5">Groupe</th>
                  <th className="px-6 py-3.5">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {sorted.map((player) => {
                  const done = player.status === 'Terminé'
                  const pct = (player.progress / totalQuestions) * 100
                  const barColor = done
                    ? (player.score <= 4 ? 'bg-rose-500' : player.score <= 8 ? 'bg-amber-500' : 'bg-emerald-500')
                    : 'bg-blue-500'
                  const badgeClass = player.group === 'Expert'
                    ? 'bg-emerald-100 text-emerald-800'
                    : player.group === 'Améliorable'
                    ? 'bg-amber-100 text-amber-800'
                    : player.group === 'Insuffisant'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-100 text-slate-600'
                  return (
                    <tr key={player.userId} className={`hover:bg-slate-50/80 transition-all ${done ? 'bg-emerald-50/5' : ''}`}>
                      <td className="px-6 py-4 flex items-center space-x-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${done ? 'bg-emerald-500' : 'bg-blue-400 animate-ping'}`}></span>
                        <span className="text-slate-800 font-bold">{escapeHtml(player.username)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3 w-40 md:w-56">
                          <span className="text-xs text-slate-500 font-bold shrink-0">{player.progress} / {totalQuestions}</span>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className={`${barColor} h-full transition-all duration-300`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="text-base font-extrabold text-slate-900">{player.score} <span className="text-xs text-slate-400 font-medium">pts</span></span></td>
                      <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs uppercase font-bold ${badgeClass}`}>{player.group}</span></td>
                      <td className="px-6 py-4"><span className={`text-xs ${done ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>{done ? `Terminé 🎉 (${player.timeSpent})` : 'En cours...'}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
