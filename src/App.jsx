import { useEffect, useState } from 'react'
import afscaData from './data/afsca.json'
import { normalizeQuiz } from './lib/normalizeQuiz'
import { Header } from './components/Header'
import { ScreenWelcome } from './components/ScreenWelcome'
import { ScreenQuiz } from './components/ScreenQuiz'
import { ScreenQuizLive } from './components/ScreenQuizLive'
import { ScreenLobby } from './components/ScreenLobby'
import { ScreenWaiting } from './components/ScreenWaiting'
import { ScreenResult } from './components/ScreenResult'
import { ScreenReview } from './components/ScreenReview'
import { ScreenDashboard } from './components/ScreenDashboard'
import { ScreenPodium } from './components/ScreenPodium'
import { ScreenAdmin } from './components/ScreenAdmin'
import { ScreenSessionEnd } from './components/ScreenSessionEnd'
import { Toast, useToast } from './components/Toast'
import { useQuizStore } from './hooks/useQuizStore'
import { useLiveQuiz } from './hooks/useLiveQuiz'
import { signInAnon, isFirebaseConfigured } from './lib/firebase'
import {
  creerSalon, inscrireJoueur, lancerPartie,
  passerQuestionSuivante, terminerSalon, abandonnerSalon,
  abonnerSalon, abonnerJoueurs,
  abonnerQuizzes, chargerQuizParId, lireRoom
} from './lib/firestore'

const S = {
  WELCOME: 'welcome',
  QUIZ: 'quiz',
  LOBBY: 'lobby',
  QUIZ_LIVE: 'quiz_live',
  WAITING: 'waiting',
  RESULT: 'result',
  REVIEW: 'review',
  DASHBOARD: 'dashboard',
  PODIUM: 'podium',
  ADMIN: 'admin',
  SESSION_END: 'session_end',
}

const ADMIN_PASSWORD = '1234'
const LS_KEY = 'qcm_scores'
const DEFAULT_QUIZ = normalizeQuiz(afscaData)

function getGroupLabel(score, groups) {
  return (groups.find(g => score <= g.maxScore) ?? groups[groups.length - 1]).label
}
function loadLeaderboard() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || [] } catch { return [] }
}
function saveToLeaderboard(name, score, time, groups) {
  const entries = loadLeaderboard()
  entries.push({ name, score, time, group: getGroupLabel(score, groups), date: new Date().toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric' }) })
  entries.sort((a, b) => b.score - a.score || a.time.localeCompare(b.time))
  localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(0, 5)))
}

export default function App() {
  // ── Quiz library ────────────────────────────────────────────────────────
  const [quizList, setQuizList] = useState([])
  const [selectedQuizId, setSelectedQuizId] = useState(null)
  const [quizData, setQuizData] = useState(DEFAULT_QUIZ)
  const { meta, groups, questions } = quizData

  // ── App state ───────────────────────────────────────────────────────────
  const [screen, setScreen] = useState(S.WELCOME)
  const [username, setUsername] = useState('')
  const [roomId, setRoomId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [livePlayers, setLivePlayers] = useState([])
  const [salon, setSalon] = useState(null)
  const [finalResult, setFinalResult] = useState(null)
  const [questionsJouees, setQuestionsJouees] = useState(null)
  const [dernierReponse, setDernierReponse] = useState(null)
  const [leaderboard, setLeaderboard] = useState(loadLeaderboard)
  const [passInput, setPassInput] = useState('')
  const [passError, setPassError] = useState(false)
  const [showPassPrompt, setShowPassPrompt] = useState(false)

  const { message: toastMsg, show: showToast } = useToast()
  const quiz = useQuizStore(questions)
  const live = useLiveQuiz(roomId, userId, questions)

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured) return
    signInAnon().then(user => { if (user) setUserId(user.uid) })
    const unsub = abonnerQuizzes(list => {
      setQuizList(list)
      setSelectedQuizId(prev => {
      const id = prev ?? (list.length > 0 ? list[0].id : null)
      if (!prev && id) {
        chargerQuizParId(id).then(doc => {
          if (doc?.rawData) setQuizData(normalizeQuiz(doc.rawData))
        })
      }
      return id
    })
    })
    return unsub
  }, [])

  // ── Quiz selection ──────────────────────────────────────────────────────
  async function handleSelectQuiz(id) {
    setSelectedQuizId(id)
    const doc = await chargerQuizParId(id)
    if (doc?.rawData) { setQuizData(normalizeQuiz(doc.rawData)); quiz.reset() }
  }

  // ── Live subscriptions ──────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return
    const unsub = abonnerJoueurs(roomId, setLivePlayers)
    return unsub
  }, [roomId])

  useEffect(() => {
    if (!roomId || screen !== S.DASHBOARD) return
    const unsub = abonnerSalon(roomId, setSalon)
    return unsub
  }, [roomId, screen])

  // ── Prof : fermeture onglet/navigateur → abandonne la session ───────────
  useEffect(() => {
    if (!roomId || screen !== S.DASHBOARD || salon?.statut === 'termine') return
    const handler = () => { abandonnerSalon(roomId) }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [roomId, screen, salon?.statut])

  // ── Player: react to salon changes ─────────────────────────────────────
  useEffect(() => {
    if (!live.salon || [S.DASHBOARD, S.PODIUM, S.ADMIN].includes(screen)) return
    const { statut, abandonne } = live.salon
    if (statut === 'attente' && screen !== S.LOBBY) setScreen(S.LOBBY)
    else if (statut === 'en-cours') {
      const enAttenteOuLobby = screen === S.LOBBY || screen === S.WAITING || screen === S.WELCOME
      if (enAttenteOuLobby) {
        if (live.aDejaRepondu) setScreen(S.WAITING)
        else setScreen(S.QUIZ_LIVE)
      }
    } else if (statut === 'termine') {
      showToast(abandonne ? '⛔ La session a été arrêtée.' : '✅ Session terminée !')
      const jouees = Math.max(1, (live.salon.questionCourante ?? 0) + 1)
      setQuestionsJouees(jouees)
      setScreen(S.SESSION_END)
    }
  }, [live.salon])

  // ── SOLO ────────────────────────────────────────────────────────────────
  async function handleJoin(name, code, avatarStyle) {
    setUsername(name)
    quiz.reset()

    if (code && code.length === 6) {
      if (!isFirebaseConfigured || !userId) {
        showToast('Firebase non configuré. Mode solo activé.')
        setScreen(S.QUIZ)
        return
      }
      // Load the quiz the teacher selected for this room
      const roomData = await lireRoom(code)
      if (roomData?.quizId) {
        const quizDoc = await chargerQuizParId(roomData.quizId)
        if (quizDoc?.rawData) { setQuizData(normalizeQuiz(quizDoc.rawData)); quiz.reset() }
      }
      setRoomId(code)
      await inscrireJoueur(code, userId, name, avatarStyle)
      setScreen(S.LOBBY)
      return
    }
    setScreen(S.QUIZ)
  }

  async function handleConfirmSolo() {
    const result = quiz.confirm()
    if (!result) return
    if (result.done) {
      const { score, answers, timeSpent } = result
      saveToLeaderboard(username, score, timeSpent, groups)
      setLeaderboard(loadLeaderboard())
      setFinalResult({ score, answers, timeSpent })
      setScreen(S.RESULT)
    }
  }

  // ── LIVE player ─────────────────────────────────────────────────────────
  async function handleReponseLive(indiceChoisi) {
    const res = await live.soumettre(indiceChoisi)
    if (!res) return
    setDernierReponse({ estCorrect: res.estCorrect, indice: live.indiceQuestion })
    setScreen(S.WAITING)
  }

  function handleSessionEndComplete() {
    const total = questionsJouees ?? questions.length
    const score = live.scoreActuel
    const diff = Math.floor((new Date() - (quiz.startTime || new Date())) / 1000)
    const m = String(Math.floor(diff / 60)).padStart(2, '0')
    const s = String(diff % 60).padStart(2, '0')
    const timeSpent = `${m}:${s}`
    saveToLeaderboard(username, score, timeSpent, groups)
    setLeaderboard(loadLeaderboard())
    setFinalResult({ score, answers: live.reponsesFinales, timeSpent, totalQuestions: total })
    setScreen(S.RESULT)
  }

  // ── TEACHER ─────────────────────────────────────────────────────────────
  async function handleCreateSession() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
    setRoomId(code)
    setLivePlayers([])
    setSalon({ statut: 'attente', questionCourante: -1 })
    setScreen(S.DASHBOARD)
    await creerSalon(code, questions.length, selectedQuizId)
    showToast(`Salon créé : ${code}`)
  }

  async function handleLancer() {
    await lancerPartie(roomId)
    setSalon(s => ({ ...s, statut: 'en-cours', questionCourante: 0 }))
  }

  async function handleQuestionSuivante(prochaineIndex) {
    await passerQuestionSuivante(roomId, prochaineIndex, questions.length)
    if (prochaineIndex >= questions.length) setSalon(s => ({ ...s, statut: 'termine' }))
    else setSalon(s => ({ ...s, questionCourante: prochaineIndex }))
  }

  function handleTerminer() {
    if (livePlayers.length > 0) setScreen(S.PODIUM)
    else handleCloseSession()
  }

  function handleCloseSession() {
    // Si la partie n'est pas encore terminée normalement → abandonner (notifie les joueurs)
    if (salon?.statut !== 'termine') {
      abandonnerSalon(roomId).catch(() => {})
    } else {
      terminerSalon(roomId).catch(() => {})
    }
    setRoomId(null); setLivePlayers([]); setSalon(null)
    setScreen(S.WELCOME)
  }

  function handleLeaveRoom() {
    setRoomId(null); quiz.reset(); setFinalResult(null)
    setScreen(S.WELCOME)
    showToast('Vous avez quitté le salon.')
  }

  function handleRestart() {
    quiz.reset(); setFinalResult(null); setRoomId(null)
    setScreen(S.WELCOME)
  }

  // ── Admin / password ────────────────────────────────────────────────────
  function handleAdminAccess() {
    setPassInput(''); setPassError(false); setShowPassPrompt(true)
  }

  function handlePassSubmit(e) {
    e.preventDefault()
    if (passInput === ADMIN_PASSWORD) { setShowPassPrompt(false); setScreen(S.ADMIN) }
    else setPassError(true)
  }

  const isDark = [S.LOBBY, S.QUIZ_LIVE, S.WAITING].includes(screen)

  return (
    <div className={`min-h-screen flex flex-col selection:bg-violet-400 selection:text-white transition-colors duration-300 ${isDark ? 'bg-[#46178F]' : 'bg-slate-50 text-slate-800'}`}>
      <Header
        meta={meta}
        username={username || null}
        isLive={!!roomId && screen !== S.DASHBOARD}
        onLeaveRoom={handleLeaveRoom}
        isDark={isDark}
      />

      <main className="flex-grow max-w-6xl w-full mx-auto px-4 py-6 md:py-10 flex flex-col justify-center">

        {screen === S.WELCOME && (
          <ScreenWelcome
            meta={meta}
            onJoin={handleJoin}
            onCreateSession={handleCreateSession}
            leaderboard={leaderboard}
            onAdmin={handleAdminAccess}
            quizList={quizList}
            selectedQuizId={selectedQuizId}
            onSelectQuiz={handleSelectQuiz}
          />
        )}

        {screen === S.QUIZ && (
          <ScreenQuiz
            currentQuestion={quiz.currentQuestion}
            currentIndex={quiz.currentIndex}
            totalQuestions={quiz.totalQuestions}
            selectedOption={quiz.selectedOption}
            startTime={quiz.startTime}
            onSelect={quiz.select}
            onConfirm={handleConfirmSolo}
          />
        )}

        {screen === S.LOBBY && (
          <ScreenLobby prenom={username} codeS={roomId} joueurs={livePlayers} />
        )}

        {screen === S.QUIZ_LIVE && live.questionCourante && (
          <ScreenQuizLive
            question={live.questionCourante}
            indice={live.indiceQuestion}
            total={questions.length}
            questionDemarreeA={live.questionDemarreeA}
            onRepondre={handleReponseLive}
          />
        )}

        {screen === S.WAITING && dernierReponse && (
          <ScreenWaiting
            estCorrect={dernierReponse.estCorrect}
            indice={dernierReponse.indice}
            total={questions.length}
          />
        )}

        {screen === S.RESULT && finalResult && (
          <ScreenResult
            username={username}
            score={finalResult.score}
            totalQuestions={finalResult?.totalQuestions ?? questions.length}
            timeSpent={finalResult.timeSpent}
            groups={groups}
            onRestart={handleRestart}
            onReview={() => setScreen(S.REVIEW)}
          />
        )}

        {screen === S.REVIEW && finalResult && (
          <ScreenReview questions={questions} answers={finalResult.answers} onBack={() => setScreen(S.RESULT)} />
        )}

        {screen === S.DASHBOARD && (
          <ScreenDashboard
            roomCode={roomId}
            players={livePlayers}
            totalQuestions={finalResult?.totalQuestions ?? questions.length}
            salon={salon}
            currentQuestion={questions[salon?.questionCourante] ?? null}
            currentCorrectIndex={questions[salon?.questionCourante]?.correctIndex ?? -1}
            onLancer={handleLancer}
            onQuestionSuivante={handleQuestionSuivante}
            onTerminer={handleTerminer}
            onClose={handleCloseSession}
          />
        )}

        {screen === S.PODIUM && (
          <ScreenPodium
            players={livePlayers}
            onBack={() => setScreen(S.DASHBOARD)}
            onClose={handleCloseSession}
          />
        )}

        {screen === S.ADMIN && (
          <ScreenAdmin
            quizList={quizList}
            onQuizAdded={({ id, title, questionCount }) => {
              setQuizList(prev => [{ id, title, questionCount }, ...prev])
              showToast('Quiz ajouté !')
            }}
            onQuizDeleted={id => setQuizList(prev => prev.filter(q => q.id !== id))}
            onBack={() => setScreen(S.WELCOME)}
          />
        )}
        {screen === S.SESSION_END && (
          <ScreenSessionEnd onComplete={handleSessionEndComplete} />
        )}
      </main>

      <footer className="bg-white border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>{meta.footer}</p>
          <div className="flex space-x-4">
            {meta.footerLinks?.map((link, i) => (
              <span key={i} className="flex items-center space-x-4">
                {i > 0 && <span>•</span>}
                <a href={link.href} className="hover:text-emerald-600 transition">{link.label}</a>
              </span>
            ))}
          </div>
        </div>
      </footer>

      <Toast message={toastMsg} />

      {showPassPrompt && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4" onClick={() => setShowPassPrompt(false)}>
          <form onSubmit={handlePassSubmit} onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm space-y-5">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Administration</h2>
              <p className="text-xs text-slate-400 mt-1">Mot de passe requis</p>
            </div>
            <input
              autoFocus
              type="password"
              value={passInput}
              onChange={e => { setPassInput(e.target.value); setPassError(false) }}
              placeholder="••••"
              className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-2xl text-lg font-bold text-center tracking-widest focus:outline-none transition
                ${passError ? 'border-rose-400 bg-rose-50' : 'border-slate-200 focus:border-emerald-500'}`}
            />
            {passError && <p className="text-xs text-rose-500 text-center font-semibold">Mot de passe incorrect.</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowPassPrompt(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl transition text-sm">
                Annuler
              </button>
              <button type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-2xl transition shadow-md text-sm">
                Entrer →
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
