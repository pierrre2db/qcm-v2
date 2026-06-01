import {
  doc, setDoc, updateDoc, getDoc, collection,
  onSnapshot, serverTimestamp
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'

function getGroupe(score) {
  if (score <= 4) return 'Insuffisant'
  if (score <= 8) return 'Améliorable'
  return 'Expert'
}

// ── SALON ──────────────────────────────────────────────────────────────────

export async function creerSalon(codeS, totalQuestions) {
  if (!isFirebaseConfigured || !db) return
  const ref = doc(db, 'rooms', codeS)
  await setDoc(ref, {
    statut: 'attente',
    questionCourante: -1,
    questionDemarreeA: null,
    totalQuestions,
    creeA: serverTimestamp()
  })
}

export async function lancerPartie(codeS) {
  if (!isFirebaseConfigured || !db) return
  const ref = doc(db, 'rooms', codeS)
  await updateDoc(ref, {
    statut: 'en-cours',
    questionCourante: 0,
    questionDemarreeA: serverTimestamp()
  })
}

export async function passerQuestionSuivante(codeS, prochaineIndex, total) {
  if (!isFirebaseConfigured || !db) return
  const ref = doc(db, 'rooms', codeS)
  if (prochaineIndex >= total) {
    await updateDoc(ref, { statut: 'termine', questionCourante: prochaineIndex })
  } else {
    await updateDoc(ref, {
      questionCourante: prochaineIndex,
      questionDemarreeA: serverTimestamp()
    })
  }
}

export async function terminerSalon(codeS) {
  if (!isFirebaseConfigured || !db) return
  const ref = doc(db, 'rooms', codeS)
  await updateDoc(ref, { statut: 'termine' })
}

export function abonnerSalon(codeS, callback) {
  if (!isFirebaseConfigured || !db) return () => {}
  const ref = doc(db, 'rooms', codeS)
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) callback(snap.data())
  }, (err) => console.error('Erreur écoute salon:', err))
}

// ── JOUEURS ────────────────────────────────────────────────────────────────

export async function inscrireJoueur(codeS, idUtilisateur, prenom) {
  if (!isFirebaseConfigured || !db) return
  const ref = doc(db, 'rooms', codeS, 'players', idUtilisateur)
  await setDoc(ref, {
    idUtilisateur,
    prenom,
    reponses: {},
    score: 0,
    statut: 'attente',
    groupe: 'En attente',
    tempsPasse: '00:00',
    derniereMiseAJour: serverTimestamp()
  })
}

export async function soumettreReponse(codeS, idUtilisateur, indiceQuestion, indiceChoisi, scoreTotal, estTermine, tempsPasse) {
  if (!isFirebaseConfigured || !db) return
  const ref = doc(db, 'rooms', codeS, 'players', idUtilisateur)
  const snap = await getDoc(ref)
  const reponsesActuelles = snap.exists() ? (snap.data().reponses || {}) : {}
  const nouvellesReponses = { ...reponsesActuelles, [indiceQuestion]: indiceChoisi }

  await updateDoc(ref, {
    reponses: nouvellesReponses,
    score: scoreTotal,
    statut: estTermine ? 'termine' : 'en-cours',
    groupe: estTermine ? getGroupe(scoreTotal) : 'En cours',
    tempsPasse: estTermine ? tempsPasse : '00:00',
    derniereMiseAJour: serverTimestamp()
  })
}

export function abonnerJoueurs(codeS, callback) {
  if (!isFirebaseConfigured || !db) return () => {}
  const ref = collection(db, 'rooms', codeS, 'players')
  return onSnapshot(ref, (snap) => {
    const joueurs = []
    snap.forEach(d => joueurs.push(d.data()))
    callback(joueurs)
  }, (err) => console.error('Erreur écoute joueurs:', err))
}

// ── QUIZ CONFIG ────────────────────────────────────────────────────────────

export async function chargerQuiz() {
  if (!isFirebaseConfigured || !db) return null
  try {
    const snap = await getDoc(doc(db, 'config', 'quiz'))
    if (!snap.exists()) return null
    const { updatedAt, ...data } = snap.data()
    return data
  } catch (e) {
    console.error('chargerQuiz:', e)
    return null
  }
}

export async function sauvegarderQuiz(rawData) {
  if (!isFirebaseConfigured || !db) return
  await setDoc(doc(db, 'config', 'quiz'), { ...rawData, updatedAt: serverTimestamp() })
}

// ── LEGACY (mode progression individuelle — gardé pour solo) ───────────────

export async function registerPlayer(roomId, userId, username) {
  return inscrireJoueur(roomId, userId, username)
}

export async function updateProgress(roomId, userId, progress, score, isFinished = false, timeSpent = '00:00') {
  if (!isFirebaseConfigured || !db) return
  const ref = doc(db, 'rooms', roomId, 'players', userId)
  await updateDoc(ref, {
    progress,
    score,
    status: isFinished ? 'Terminé' : 'En cours',
    group: isFinished || progress > 0 ? getGroupe(score) : 'En attente',
    timeSpent,
    lastUpdated: serverTimestamp()
  })
}

export function subscribeToPlayers(roomId, callback) {
  return abonnerJoueurs(roomId, callback)
}
