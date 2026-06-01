import { useEffect, useRef, useState } from 'react'
import QRious from 'qrious'

const DUREE_QUESTION = 60

function escapeHtml(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function ScreenDashboard({ roomCode, players, totalQuestions, salon, onLancer, onQuestionSuivante, onTerminer, onClose }) {
  const qrRef = useRef(null)
  const [secondes, setSecondes] = useState(DUREE_QUESTION)
  const [autoAvanceDeclenche, setAutoAvanceDeclenche] = useState(false)

  const statut = salon?.statut ?? 'attente'
  const indiceQuestion = salon?.questionCourante ?? -1
  const questionDemarreeA = salon?.questionDemarreeA?.toDate?.() ?? null
  const estLobby = statut === 'attente'
  const estEnCours = statut === 'en-cours'
  const estTermine = statut === 'termine'

  useEffect(() => {
    if (!qrRef.current) return
    const url = `${window.location.origin}/qcm-v2/?room=${roomCode}`
    new QRious({ element: qrRef.current, value: url, size: 200, background: '#ffffff', foreground: '#059669', level: 'H' })
  }, [roomCode])

  // Minuterie synchronisée avec questionDemarreeA
  useEffect(() => {
    if (!estEnCours || !questionDemarreeA) return
    setAutoAvanceDeclenche(false)

    const calc = () => {
      const ecoule = Math.floor((new Date() - questionDemarreeA) / 1000)
      const restant = Math.max(0, DUREE_QUESTION - ecoule)
      setSecondes(restant)
      if (restant === 0 && !autoAvanceDeclenche) {
        setAutoAvanceDeclenche(true)
        onQuestionSuivante(indiceQuestion + 1)
      }
    }
    calc()
    const interval = setInterval(calc, 500)
    return () => clearInterval(interval)
  }, [questionDemarreeA, indiceQuestion, estEnCours])

  const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const nbARepondu = estEnCours
    ? players.filter(p => p.reponses && p.reponses[indiceQuestion] !== undefined).length
    : 0
  const completedCount = players.filter(p => p.statut === 'termine' || p.status === 'Terminé').length
  const average = players.length > 0
    ? (players.reduce((s, p) => s + (p.score ?? 0), 0) / players.length).toFixed(1)
    : '--'

  const pctTimer = (secondes / DUREE_QUESTION) * 100
  const couleurTimer = secondes > 30 ? 'bg-emerald-500' : secondes > 10 ? 'bg-amber-500' : 'bg-rose-500'

  async function copyLink() {
    const url = `${window.location.origin}/qcm-v2/?room=${roomCode}`
    try { await navigator.clipboard.writeText(url) } catch {
      const el = document.createElement('textarea')
      el.value = url; document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
    }
  }

  return (
    <div className="space-y-8">

      {/* En-tête session — toujours visible */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-7 space-y-4">
          <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>{estLobby ? 'Session en attente' : estEnCours ? 'Partie en cours' : 'Session terminée'}</span>
          </div>

          <h2 className="text-3xl font-black text-slate-950">
            {estLobby ? 'Rejoignez le concours !' : estEnCours ? `Question ${indiceQuestion + 1} / ${totalQuestions}` : 'Partie terminée'}
          </h2>

          {estLobby && (
            <p className="text-slate-500 text-sm">Projetez cet écran. Les élèves scannent le QR code ou entrent le code ci-dessous.</p>
          )}

          <div className="flex flex-wrap gap-4 items-center">
            <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-lg">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Code de Session</span>
              <span className="text-3xl font-black tracking-widest text-emerald-400">{roomCode}</span>
            </div>
            <button onClick={copyLink} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-2xl text-xs transition flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Copier le lien</span>
            </button>
          </div>

          {/* Boutons de contrôle */}
          {estLobby && (
            <button
              onClick={onLancer}
              disabled={players.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg transition flex items-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Lancer la partie {players.length > 0 ? `(${players.length} joueur${players.length > 1 ? 's' : ''})` : '— En attente de joueurs'}</span>
            </button>
          )}

          {estEnCours && (
            <div className="space-y-3">
              {/* Minuterie */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Temps restant</span>
                  <span className={`font-black text-base ${secondes <= 10 ? 'text-rose-500 animate-pulse' : 'text-slate-700'}`}>{secondes}s</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className={`${couleurTimer} h-full transition-all duration-500`} style={{ width: `${pctTimer}%` }} />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                <strong className="text-emerald-600">{nbARepondu} / {players.length}</strong> joueurs ont répondu
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => onQuestionSuivante(indiceQuestion + 1)}
                  disabled={nbARepondu === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition shadow-md flex items-center space-x-2"
                >
                  <span>{indiceQuestion + 1 >= totalQuestions ? 'Terminer la partie' : 'Question suivante →'}</span>
                </button>
                <button
                  onClick={onTerminer}
                  className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold py-3 px-4 rounded-xl transition text-sm"
                >
                  Arrêter
                </button>
              </div>
            </div>
          )}

          {estTermine && (
            <button onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 px-6 rounded-xl transition">
              Fermer le salon
            </button>
          )}
        </div>

        {/* QR Code */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-4 border border-slate-100 bg-slate-50 rounded-2xl text-center space-y-2">
          <canvas ref={qrRef} className="rounded-xl" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scanner pour rejoindre</span>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Participants', value: players.length },
          { label: 'Terminés', value: `${completedCount} / ${players.length}` },
          { label: 'Moyenne', value: `${average} / ${totalQuestions}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-md">
            <span className="text-xs text-slate-400 font-bold uppercase block">{label}</span>
            <span className="text-3xl font-extrabold text-slate-900">{value}</span>
          </div>
        ))}
      </div>

      {/* Tableau joueurs */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">Suivi des participants</h3>
            <p className="text-xs text-slate-500">Mis à jour en temps réel.</p>
          </div>
          {!estLobby && (
            <button onClick={() => { if (players.length > 0) onTerminer() }}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-md">
              Clôturer & Podium
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          {sorted.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm space-y-2">
              <div className="animate-bounce text-2xl">⏳</div>
              <p>En attente des premiers participants...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100/70 text-slate-600 font-bold text-xs uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Joueur</th>
                  <th className="px-6 py-3.5">Score</th>
                  <th className="px-6 py-3.5">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {sorted.map((player, i) => {
                  const prenom = player.prenom || player.username || '?'
                  const done = player.statut === 'termine' || player.status === 'Terminé'
                  return (
                    <tr key={player.idUtilisateur || player.userId || i} className="hover:bg-slate-50/80 transition-all">
                      <td className="px-6 py-4 flex items-center space-x-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${done ? 'bg-emerald-500' : 'bg-blue-400 animate-ping'}`} />
                        <span className="text-slate-800 font-bold">{escapeHtml(prenom)}</span>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-slate-900">{player.score ?? 0} <span className="text-xs font-normal text-slate-400">pts</span></td>
                      <td className="px-6 py-4 text-xs">
                        {done
                          ? <span className="text-emerald-600 font-bold">Terminé ✓</span>
                          : estLobby
                          ? <span className="text-slate-400">En attente...</span>
                          : <span className="text-blue-500">En cours...</span>
                        }
                      </td>
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
