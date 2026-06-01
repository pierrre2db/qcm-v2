import { useEffect, useRef, useState } from 'react'
import QRious from 'qrious'

const DUREE_QUESTION = 60

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

  const joinUrl = `${window.location.origin}/qcm-v2/?room=${roomCode}`

  useEffect(() => {
    if (!qrRef.current) return
    const size = estLobby ? 280 : 160
    new QRious({ element: qrRef.current, value: joinUrl, size, background: '#ffffff', foreground: '#059669', level: 'H' })
  }, [roomCode, estLobby])

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

  const nbARepondu = estEnCours
    ? players.filter(p => p.reponses && p.reponses[indiceQuestion] !== undefined).length
    : 0
  const completedCount = players.filter(p => p.statut === 'termine').length
  const average = players.length > 0
    ? (players.reduce((s, p) => s + (p.score ?? 0), 0) / players.length).toFixed(1)
    : '--'

  const pctTimer = (secondes / DUREE_QUESTION) * 100
  const couleurTimer = secondes > 30 ? 'bg-emerald-500' : secondes > 10 ? 'bg-amber-500' : 'bg-rose-500'

  async function copyLink() {
    try { await navigator.clipboard.writeText(joinUrl) } catch {
      const el = document.createElement('textarea')
      el.value = joinUrl; document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
    }
  }

  // ── LOBBY ────────────────────────────────────────────────────────────────
  if (estLobby) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
              <span className="text-white font-bold text-sm">Session en attente</span>
            </div>
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
              {players.length} joueur{players.length !== 1 ? 's' : ''} connecté{players.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Main content: QR + code */}
          <div className="p-8 flex flex-col md:flex-row items-center gap-8">
            {/* QR Code block */}
            <div className="flex flex-col items-center space-y-4 shrink-0">
              <div className="bg-white p-4 rounded-2xl border-2 border-emerald-100 shadow-lg">
                <canvas ref={qrRef} className="block rounded-xl" />
              </div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Scanner pour rejoindre</p>
            </div>

            {/* Code + URL + actions */}
            <div className="flex-1 space-y-6 text-center md:text-left">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Code de Session</p>
                <div className="bg-slate-900 text-emerald-400 px-8 py-5 rounded-2xl shadow-lg inline-block">
                  <span className="text-5xl md:text-6xl font-black tracking-widest">{roomCode}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lien direct</p>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                  <span className="text-slate-600 text-sm font-mono break-all flex-1">{joinUrl}</span>
                  <button onClick={copyLink} className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">
                    Copier
                  </button>
                </div>
              </div>

              <button
                onClick={onLancer}
                disabled={players.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-2xl shadow-lg transition flex items-center space-x-2 mx-auto md:mx-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{players.length > 0 ? `Lancer la partie (${players.length} joueur${players.length > 1 ? 's' : ''})` : 'En attente de joueurs...'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Players list */}
        {players.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-extrabold text-slate-900">Joueurs connectés</h3>
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {players.map((p, i) => (
                <span key={p.idUtilisateur || i} className="bg-emerald-50 text-emerald-800 font-semibold text-sm px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {p.prenom || p.username || '?'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── EN COURS ─────────────────────────────────────────────────────────────
  if (estEnCours) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
            <span className="text-white font-bold">Question {indiceQuestion + 1} / {totalQuestions}</span>
            <span className={`font-black text-xl ${secondes <= 10 ? 'text-rose-300 animate-pulse' : 'text-white'}`}>{secondes}s</span>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* QR + code — toujours visible pour retardataires */}
            <div className="flex items-center gap-4">
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow shrink-0">
                <canvas ref={qrRef} className="block rounded-lg" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Code</p>
                <span className="text-3xl font-black tracking-widest text-emerald-600">{roomCode}</span>
                <p className="text-[10px] text-slate-400 mt-1 font-mono break-all">{joinUrl}</p>
              </div>
            </div>

            {/* Stats + contrôles */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Temps restant</span>
                  <span className={secondes <= 10 ? 'text-rose-500 font-black' : ''}>{secondes}s</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className={`${couleurTimer} h-full transition-all duration-500`} style={{ width: `${pctTimer}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Répondu', value: `${nbARepondu}/${players.length}` },
                  { label: 'Score moy.', value: `${average}` },
                  { label: 'Terminés', value: completedCount },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">{label}</span>
                    <span className="text-xl font-extrabold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => onQuestionSuivante(indiceQuestion + 1)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition shadow-md"
                >
                  {indiceQuestion + 1 >= totalQuestions ? 'Terminer la partie' : 'Question suivante →'}
                </button>
                <button
                  onClick={onTerminer}
                  className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold py-3 px-4 rounded-xl transition text-sm"
                >
                  Arrêter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── TERMINÉ ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl text-center space-y-6">
        <div>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1.5 rounded-full uppercase">Partie terminée</span>
          <h2 className="text-3xl font-black text-slate-950 mt-3">Session clôturée</h2>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
          {[
            { label: 'Participants', value: players.length },
            { label: 'Terminés', value: completedCount },
            { label: 'Moyenne', value: `${average}` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">{label}</span>
              <span className="text-2xl font-extrabold text-slate-900">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-center">
          {players.length > 0 && (
            <button onClick={onTerminer} className="bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 px-6 rounded-xl transition shadow-md">
              Voir le Podium
            </button>
          )}
          <button onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 px-6 rounded-xl transition">
            Fermer le salon
          </button>
        </div>
      </div>
    </div>
  )
}
