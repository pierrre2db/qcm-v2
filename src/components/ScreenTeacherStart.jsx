import { useEffect, useRef, useState } from 'react'
import QRious from 'qrious'

const BASE_URL = `${window.location.origin}/qcm-v2/`

const STEPS = [
  {
    num: '01',
    icon: '📋',
    title: 'Choisissez votre quiz',
    desc: 'Sélectionnez le questionnaire adapté à votre formation.',
  },
  {
    num: '02',
    icon: '📱',
    title: 'Les joueurs rejoignent',
    desc: 'Ils scannent le QR code ou tapent l\'adresse sur leur mobile. Aucune inscription requise.',
  },
  {
    num: '03',
    icon: '🚀',
    title: 'Lancez la partie !',
    desc: 'Quand tout le monde est dans la salle, vous donnez le départ. Suivez les réponses en direct.',
  },
]

export function ScreenTeacherStart({ quizList, selectedQuizId, onSelectQuiz, onCreateSession, onBack }) {
  const qrRef = useRef(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!qrRef.current) return
    new QRious({
      element: qrRef.current,
      value: BASE_URL,
      size: 160,
      background: '#1e293b',
      foreground: '#10b981',
      level: 'H',
    })
  }, [])

  function handleCopy() {
    navigator.clipboard.writeText(BASE_URL).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">
          Espace Enseignant
        </span>
        <div className="w-20" /> {/* spacer */}
      </div>

      {/* Main */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 space-y-10">

        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="text-5xl">🛡️</div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            Prêt à lancer votre session ?
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Défi Hygiène &amp; Sécurité Alimentaire · Mode Live
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-4">
          {STEPS.map((s, i) => (
            <div
              key={s.num}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 relative overflow-hidden"
            >
              <div className="absolute top-3 right-4 text-4xl font-black text-white/5 select-none">{s.num}</div>
              <div className="text-3xl">{s.icon}</div>
              <h3 className="font-bold text-white text-sm">{s.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{s.desc}</p>
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-slate-600 text-xl">›</div>
              )}
            </div>
          ))}
        </div>

        {/* Quiz selector */}
        {quizList && quizList.length > 0 && (
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Choisir le quiz
            </label>
            <div className="flex flex-wrap gap-2">
              {quizList.map(q => {
                const active = selectedQuizId === q.id
                return (
                  <button
                    key={q.id}
                    onClick={() => onSelectQuiz(q.id)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all
                      ${active
                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:border-emerald-500/40 hover:bg-white/10'
                      }`}
                  >
                    {q.title}
                    <span className="ml-2 text-xs opacity-60">{q.questionCount}Q</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* QR + URL block */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="shrink-0">
            <canvas ref={qrRef} className="rounded-xl block" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Lien de connexion joueurs
              </p>
              <p className="text-slate-300 text-xs">
                Les joueurs ouvrent ce lien sur leur mobile, entrent le code de salle affiché sur votre tableau de bord et rejoignent la session.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-4 py-3">
              <code className="text-emerald-400 text-xs font-mono flex-1 break-all">{BASE_URL}</code>
              <button
                onClick={handleCopy}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                  ${copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300'
                  }`}
              >
                {copied ? '✓ Copié' : 'Copier'}
              </button>
            </div>
            <p className="text-slate-500 text-xs">
              💡 Le QR code avec le code de salle exact s'affichera dans votre tableau de bord une fois la session créée.
            </p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onCreateSession}
          className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-black text-lg py-5 rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-3 group"
        >
          <span>Créer ma session</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>

      </div>
    </div>
  )
}
