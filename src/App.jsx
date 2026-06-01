import { useEffect, useState } from 'react'
import afscaData from './data/afsca.json'
import { Header } from './components/Header'
import { ScreenWelcome } from './components/ScreenWelcome'
import { ScreenQuiz } from './components/ScreenQuiz'
import { ScreenResult } from './components/ScreenResult'
import { ScreenReview } from './components/ScreenReview'
import { ScreenDashboard } from './components/ScreenDashboard'
import { ScreenPodium } from './components/ScreenPodium'
import { Toast, useToast } from './components/Toast'
import { useQuizStore } from './hooks/useQuizStore'
import { signInAnon, isFirebaseConfigured } from './lib/firebase'
import { registerPlayer, updateProgress, subscribeToPlayers } from './lib/firestore'

const S = {
  WELCOME: 'welcome',
  QUIZ: 'quiz',
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
  entries.push({
    name, score, time,
    group: getGroupLabel(score, groups),
    date: new Date().toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric' })
  })
  entries.sort((a, b) => b.score - a.score || a.time.localeCompare(b.time))
  localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(0, 5)))
}

export default function App() {
  const { meta, groups, questions } = afscaData

  const [screen, setScreen] = useState(S.WELCOME)
  const [username, setUsername] = useState('')
  const [roomId, setRoomId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [livePlayers, setLivePlayers] = useState([])
  const [finalResult, setFinalResult] = useState(null)
  const [leaderboard, setLeaderboard] = useState(loadLeaderboard)
  const { message: toastMsg, show: showToast } = useToast()
  const quiz = useQuizStore(questions)

  useEffect(() => {
    if (!isFirebaseConfigured) return
    signInAnon().then(user => { if (user) setUserId(user.uid) })
  }, [])

  useEffect(() => {
    if (!roomId) return
    const unsub = subscribeToPlayers(roomId, setLivePlayers)
    return unsub
  }, [roomId])

  async function handleJoin(name, code) {
    setUsername(name)
    if (code && code.length === 6) {
      if (!isFirebaseConfigured || !userId) {
        showToast('Firebase non configuré. Mode solo activé.')
      } else {
        setRoomId(code)
        await registerPlayer(code, userId, name)
        showToast(`Salon ${code} rejoint !`)
      }
    }
    quiz.reset()
    setScreen(S.QUIZ)
  }

  async function handleConfirm() {
    const result = quiz.confirm()
    if (!result) return

    if (roomId && userId) {
      await updateProgress(roomId, userId, quiz.currentIndex + 1, result.score, false)
    }

    if (result.done) {
      const { score, answers, timeSpent } = result
      if (roomId && userId) {
        await updateProgress(roomId, userId, questions.length, score, true, timeSpent)
      }
      saveToLeaderboard(username, score, timeSpent, groups)
      setLeaderboard(loadLeaderboard())
      setFinalResult({ score, answers, timeSpent })
      setScreen(S.RESULT)
    }
  }

  async function handleCreateSession() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
    setRoomId(code)
    setLivePlayers([])
    setScreen(S.DASHBOARD)
    showToast(`Salon créé : ${code}`)
  }

  function handleLeaveRoom() {
    setRoomId(null)
    setLivePlayers([])
    quiz.reset()
    setFinalResult(null)
    setScreen(S.WELCOME)
    showToast('Vous avez quitté le salon.')
  }

  function handleRestart() {
    quiz.reset()
    setFinalResult(null)
    setScreen(S.WELCOME)
  }

  function handleCloseSession() {
    setRoomId(null)
    setLivePlayers([])
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
          <ScreenWelcome
            meta={meta}
            onJoin={handleJoin}
            onCreateSession={handleCreateSession}
            leaderboard={leaderboard}
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
            onConfirm={handleConfirm}
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
          <ScreenReview
            questions={questions}
            answers={finalResult.answers}
            onBack={() => setScreen(S.RESULT)}
          />
        )}

        {screen === S.DASHBOARD && (
          <ScreenDashboard
            roomCode={roomId}
            players={livePlayers}
            totalQuestions={questions.length}
            onPodium={() => {
              if (livePlayers.length === 0) { showToast('Aucun participant connecté.'); return }
              setScreen(S.PODIUM)
            }}
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
    </div>
  )
}
