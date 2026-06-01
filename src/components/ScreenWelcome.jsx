import { useEffect, useRef, useState } from 'react'
import QRious from 'qrious'
import { isFirebaseConfigured } from '../lib/firebase'
import { AVATAR_STYLES, getAvatarUrl, getInitials, loadSavedStyle, saveStyle } from '../lib/avatars'

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function ScreenWelcome({ meta, onJoin, onCreateSession, leaderboard, onAdmin, quizList, selectedQuizId, onSelectQuiz }) {
  const qrRef = useRef(null)
  const [username, setUsername] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState('solo') // 'solo' | 'live'
  const [avatarStyle, setAvatarStyle] = useState(loadSavedStyle)
  const [avatarImgOk, setAvatarImgOk] = useState({ 'bottts-neutral': true, 'fun-emoji': true, 'pixel-art-neutral': true })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const room = params.get('room')
    if (room) {
      setRoomCode(room.toUpperCase())
      setMode('live')
    }
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
    saveStyle(avatarStyle)
    onJoin(username.trim(), mode === 'live' ? roomCode.trim().toUpperCase() : '', avatarStyle)
  }

  function pickStyle(id) {
    setAvatarStyle(id)
    saveStyle(id)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleJoin()
  }

  function switchMode(m) {
    setMode(m)
    setError('')
  }

  return (
    <div className="space-y-8">

      {/* Hero */}
      <div className="text-center space-y-3">
        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full tracking-wide uppercase">
          {meta.badge}
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
          Concours d'Hygiène de Classe
        </h2>
        <p className="text-slate-500 max-w-md mx-auto text-sm">
          Testez vos connaissances en solo ou rejoignez la session de votre classe.
        </p>
      </div>

      {/* Mode toggle + form card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">

        {/* Toggle tabs */}
        <div className="grid grid-cols-2 border-b border-slate-100">
          <button
            onClick={() => switchMode('solo')}
            className={`py-4 px-6 flex items-center justify-center gap-2.5 font-bold text-sm transition-colors
              ${mode === 'solo'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Entraînement Solo</span>
          </button>
          <button
            onClick={() => switchMode('live')}
            className={`py-4 px-6 flex items-center justify-center gap-2.5 font-bold text-sm transition-colors
              ${mode === 'live'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Rejoindre la Classe</span>
          </button>
        </div>

        {/* Form body */}
        <div className="p-6 md:p-8 space-y-5">

          {/* Pseudonym — always shown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Votre Pseudonyme</label>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError('') }}
              onKeyDown={handleKeyDown}
              placeholder="Ex: Chef_Antoine"
              autoFocus
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800 transition"
            />
          </div>

          {/* Avatar style picker */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Votre Avatar</label>
            <div className="flex gap-3">
              {AVATAR_STYLES.map(s => {
                const seed = username.trim() || 'preview'
                const selected = avatarStyle === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => pickStyle(s.id)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 transition-all flex-1
                      ${selected ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
                  >
                    <div className={`w-14 h-14 rounded-full overflow-hidden shadow-sm ${selected ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}>
                      {avatarImgOk[s.id] ? (
                        <img
                          src={getAvatarUrl(seed, s.id)}
                          alt={s.label}
                          key={seed + s.id}
                          onError={() => setAvatarImgOk(prev => ({ ...prev, [s.id]: false }))}
                          className="w-full h-full object-cover bg-slate-100"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-200 flex items-center justify-center text-lg">{s.emoji}</div>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${selected ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {s.emoji} {s.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quiz selector — solo only */}
          {mode === 'solo' && quizList && quizList.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Choisir un quiz</label>
              <div className="flex flex-wrap gap-2">
                {quizList.map(q => (
                  <button
                    key={q.id}
                    onClick={() => onSelectQuiz(q.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition border-2
                      ${selectedQuizId === q.id
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
                      }`}
                  >
                    {q.title}
                    <span className="ml-1.5 text-xs opacity-70">{q.questionCount}Q</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Room code — live only */}
          {mode === 'live' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Code de Session (6 caractères)</label>
              <input
                type="text"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                maxLength={6}
                placeholder="Ex: HYG39B"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold uppercase tracking-widest text-emerald-700 transition text-center text-xl"
              />
              <p className="text-xs text-slate-400 text-center">Code affiché sur l'écran de votre professeur</p>
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
              <span>⚠ {error}</span>
            </p>
          )}

          <button
            onClick={handleJoin}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 group"
          >
            {mode === 'solo' ? (
              <>
                <span>Commencer l'entraînement</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </>
            ) : (
              <>
                <span>Rejoindre la session</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Teacher section */}
      <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white p-6 md:p-8 rounded-3xl shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1 space-y-3">
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">Espace Enseignant</span>
            <h3 className="text-xl font-bold tracking-tight">Projeter le Dashboard</h3>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
              Générez un code de classe, affichez un QR Code géant au projecteur et observez la progression de tous vos élèves en temps réel.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={onCreateSession}
                disabled={!isFirebaseConfigured}
                className="bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed font-bold py-3 px-5 rounded-2xl transition shadow-lg flex items-center gap-2 text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Créer une session live</span>
              </button>
              <button
                onClick={onAdmin}
                className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-300 text-xs font-semibold py-3 px-4 rounded-2xl border border-white/10 hover:border-emerald-500/40 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Administration</span>
              </button>
            </div>
            {!isFirebaseConfigured && (
              <p className="text-xs text-amber-400">Configurez Firebase dans src/lib/firebase.js</p>
            )}
          </div>
          <div className="flex justify-center md:justify-end shrink-0">
            <canvas ref={qrRef} className="rounded-xl" />
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
