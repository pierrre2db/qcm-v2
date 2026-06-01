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
import { AdminModal } from './components/AdminModal'
import { Toast, useToast } from './components/Toast'
import { useQuizStore } from './hooks/useQuizStore'
import { useLiveQuiz } from './hooks/useLiveQuiz'
import { signInAnon, isFirebaseConfigured } from './lib/firebase'
import {
  creerSalon, inscrireJoueur, lancerPartie,
  passerQuestionSuivante, terminerSalon,
  abonnerSalon, abonnerJoueurs,
  chargerQuiz
} from './lib/firestore'

const S = {
  WELCOME: 'welcome',
  QUIZ: 'quiz',
  LOBBY: 'lobby',        // joueur attend
  QUIZ_LIVE: 'quiz_live',
  WAITING: 'waiting',    // joueur a répondu, attend suivante
  RESULT: 'result',
  REVIEW: 'review',
  DASHBOARD: 'dashboard',
  PODIUM: 'podium',
}

const LS_KEY = 'qcm_scores'

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
  const [quizData, setQuizData] = useState(() => normalizeQuiz(afscaData))
  const { meta, groups, questions } = quizData
  const [showAdmin, setShowAdmin] = useState(false)

  const [screen, setScreen] = useState(S.WELCOME)
  const [username, setUsername] = useState('')
  const [roomId, setRoomId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [livePlayers, setLivePlayers] = useState([])
  const [salon, setSalon] = useState(null)
  const [finalResult, setFinalResult] = useState(null)
  const [dernierReponse, setDernierReponse] = useState(null) // { estCorrect, indice }
  const [leaderboard, setLeaderboard] = useState(loadLeaderboard)
  const { message: toastMsg, show: showToast } = useToast()
  const quiz = useQuizStore(questions)
  const live = useLiveQuiz(roomId, userId, questions)

  useEffect(() => {
    if (!isFirebaseConfigured) return
    signInAnon().then(user => { if (user) setUserId(user.uid) })
    chargerQuiz().then(data => { if (data) setQuizData(normalizeQuiz(data)) })
  }, [])

  // Abonnement joueurs (dashboard + lobby)
  useEffect(() => {
    if (!roomId) return
    const unsub = abonnerJoueurs(roomId, setLivePlayers)
    return unsub
  }, [roomId])

  // Abonnement salon (enseignant)
  useEffect(() => {
    if (!roomId || screen !== S.DASHBOARD) return
    const unsub = abonnerSalon(roomId, setSalon)
    return unsub
  }, [roomId, screen])

  // Joueur : réagir aux changements du salon
  useEffect(() => {
    if (!live.salon || screen === S.DASHBOARD) return
    const { statut, questionCourante } = live.salon

    if (statut === 'attente' && screen !== S.LOBBY) {
      setScreen(S.LOBBY)
    } else if (statut === 'en-cours') {
      if (screen === S.LOBBY || screen === S.WAITING) {
        setScreen(S.QUIZ_LIVE)
      }
      if (screen === S.WAITING && !live.aDejaRepondu) {
        setScreen(S.QUIZ_LIVE)
      }
    } else if (statut === 'termine') {
      const score = live.scoreActuel
      const diff = Math.floor((new Date() - (quiz.startTime || new Date())) / 1000)
      const m = String(Math.floor(diff / 60)).padStart(2, '0')
      const s = String(diff % 60).padStart(2, '0')
      const timeSpent = `${m}:${s}`
      saveToLeaderboard(username, score, timeSpent, groups)
      setLeaderboard(loadLeaderboard())
      setFinalResult({ score, answers: live.reponsesFinales, timeSpent })
      setScreen(S.RESULT)
    }
  }, [live.salon])

  // SOLO
  async function handleJoin(name, code) {
    setUsername(name)
    quiz.reset()

    if (code && code.length === 6) {
      if (!isFirebaseConfigured || !userId) {
        showToast('Firebase non configuré. Mode solo activé.')
        setScreen(S.QUIZ)
        return
      }
      setRoomId(code)
      await inscrireJoueur(code, userId, name)
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

  // LIVE — joueur répond
  async function handleReponseLive(indiceChoisi) {
    const res = await live.soumettre(indiceChoisi)
    if (!res) return
    setDernierReponse({ estCorrect: res.estCorrect, indice: live.indiceQuestion })
    setScreen(S.WAITING)
  }

  // ENSEIGNANT — créer session
  async function handleCreateSession() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
    setRoomId(code)
    setLivePlayers([])
    setSalon({ statut: 'attente', questionCourante: -1 })
    await creerSalon(code, questions.length)
    setScreen(S.DASHBOARD)
    showToast(`Salon créé : ${code}`)
  }

  async function handleLancer() {
    await lancerPartie(roomId)
    setSalon(s => ({ ...s, statut: 'en-cours', questionCourante: 0 }))
  }

  async function handleQuestionSuivante(prochaineIndex) {
    await passerQuestionSuivante(roomId, prochaineIndex, questions.length)
    if (prochaineIndex >= questions.length) {
      setSalon(s => ({ ...s, statut: 'termine' }))
    } else {
      setSalon(s => ({ ...s, questionCourante: prochaineIndex }))
    }
  }

  function handleTerminer() {
    if (livePlayers.length > 0) setScreen(S.PODIUM)
    else handleCloseSession()
  }

  function handleCloseSession() {
    terminerSalon(roomId).catch(() => {})
    setRoomId(null)
    setLivePlayers([])
    setSalon(null)
    setScreen(S.WELCOME)
  }

  function handleLeaveRoom() {
    setRoomId(null)
    quiz.reset()
    setFinalResult(null)
    setScreen(S.WELCOME)
    showToast('Vous avez quitté le salon.')
  }

  function handleRestart() {
    quiz.reset()
    setFinalResult(null)
    setRoomId(null)
    setScreen(S.WELCOME)
  }

  return (
    <div className="bg-slate-50 text-slate-800 min-h-screen flex flex-col selection:bg-emerald-500 selection:text-white">
      <Header
        meta={meta}
        username={username || null}
        isLive={!!roomId && screen !== S.DASHBOARD}
        onLeaveRoom={handleLeaveRoom}
      />

      <main className="flex-grow max-w-6xl w-full mx-auto px-4 py-6 md:py-10 flex flex-col justify-center">

        {screen === S.WELCOME && (
          <ScreenWelcome meta={meta} onJoin={handleJoin} onCreateSession={handleCreateSession} leaderboard={leaderboard} onAdmin={() => setShowAdmin(true)} />
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
            totalQuestions={questions.length}
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
            totalQuestions={questions.length}
            salon={salon}
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
      {showAdmin && (
        <AdminModal
          onClose={() => setShowAdmin(false)}
          onQuizLoaded={normalized => { setQuizData(normalized); quiz.reset(); showToast('Quiz chargé !') }}
        />
      )}
    </div>
  )
}
