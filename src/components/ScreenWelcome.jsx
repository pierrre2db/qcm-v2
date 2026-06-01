import { useEffect, useRef, useState } from 'react'
import QRious from 'qrious'
import { isFirebaseConfigured } from '../lib/firebase'

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function ScreenWelcome({ meta, onJoin, onCreateSession, leaderboard, onAdmin }) {
  const qrRef = useRef(null)
  const [username, setUsername] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const room = params.get('room')
    if (room) setRoomCode(room.toUpperCase())
  }, [])

  useEffect(() => {
    if (!qrRef.current) return
    new QRious({
      element: qrRef.current,
      value: window.location.href.split('?')[0],
      size: 140,
      background: '#ffffff',
      foreground: '#059669',
      level: 'H'
    })
  }, [])

  function handleJoin() {
    if (!username.trim()) {
      setError('Veuillez entrer un pseudonyme pour commencer.')
      return
    }
    setError('')
    onJoin(username.trim(), roomCode.trim().toUpperCase())
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleJoin()
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full tracking-wide uppercase">
          {meta.badge}
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
          Concours d'Hygiène de Classe
        </h2>
        <p className="text-slate-600 max-w-lg mx-auto text-sm md:text-base">
          Rejoignez le défi lancé par votre professeur ou créez votre propre espace enseignant pour suivre les résultats en direct.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Student section */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 md:col-span-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">1</span>
              <span>Rejoindre la classe</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Votre Pseudonyme</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ex: Chef_Antoine"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800 transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Code de Session (6 lettres)</label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  maxLength={6}
                  placeholder="Ex: HYG39B"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold uppercase tracking-widest text-emerald-700 transition"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-500 font-medium flex items-center space-x-1">
                <span>⚠ {error}</span>
              </p>
            )}
          </div>

          <div className="space-y-4 pt-4">
            <button
              onClick={handleJoin}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center space-x-2 group"
            >
              <span>Se connecter & Commencer</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
            <p className="text-xs text-center text-slate-400">Pour jouer en solo sans suivi de classe, laissez simplement le code vide.</p>
          </div>
        </div>

        {/* Teacher section */}
        <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white p-6 md:p-8 rounded-3xl shadow-xl flex flex-col justify-between space-y-6 md:col-span-5">
          <div className="space-y-3">
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">Espace Enseignant</span>
            <h3 className="text-xl font-bold tracking-tight">Projeter le Dashboard</h3>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
              Générez un code de classe, affichez un QR Code géant au projecteur et observez la progression de tous vos élèves en temps réel.
            </p>
            <div className="flex justify-center pt-2">
              <canvas ref={qrRef} className="rounded-xl" />
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={onCreateSession}
              disabled={!isFirebaseConfigured}
              className="w-full bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed font-bold py-3.5 px-4 rounded-2xl transition shadow-lg flex items-center justify-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Créer une session live</span>
            </button>
            {!isFirebaseConfigured && (
              <p className="text-xs text-amber-400 text-center">Configurez Firebase dans src/lib/firebase.js</p>
            )}
            <button
              onClick={onAdmin}
              className="w-full flex items-center justify-center space-x-2 text-slate-400 hover:text-emerald-300 text-xs font-semibold py-1.5 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Administration</span>
            </button>
          </div>
        </div>
      </div>

      {/* Solo leaderboard */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/40 space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 0h4l-1 3h-3m1 3h3l-1-3h-3m-2 0h-3l1 3h3M4 19h16" />
          </svg>
          <span>Derniers exploits en Solo</span>
        </h3>
        <div className="overflow-hidden border border-slate-100 rounded-2xl bg-slate-50">
          {leaderboard.length === 0 ? (
            <p className="text-center py-6 text-slate-400 text-xs">Aucun score enregistré. Soyez le premier !</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs font-bold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3 text-center w-12">#</th>
                  <th className="px-4 py-3">Pseudo</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Groupe</th>
                  <th className="px-4 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaderboard.map((item, i) => {
                  const badgeColor = item.group === 'Expert'
                    ? 'bg-emerald-100 text-emerald-800'
                    : item.group === 'Améliorable'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className={`px-4 py-3 text-center ${i === 0 ? 'text-amber-500 font-extrabold text-base' : 'text-slate-500 font-semibold'}`}>{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{escapeHtml(item.name)}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{item.score} / 10 <span className="text-xs font-normal text-slate-400">({item.time})</span></td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] tracking-wide uppercase font-bold ${badgeColor}`}>{item.group}</span></td>
                      <td className="px-4 py-3 text-right text-xs text-slate-400">{item.date}</td>
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
