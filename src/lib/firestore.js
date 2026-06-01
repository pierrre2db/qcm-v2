import {
  doc, setDoc, updateDoc, getDoc, collection,
  onSnapshot, serverTimestamp, getDocs, addDoc, deleteDoc,
  query, orderBy
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'

function getGroupe(score) {
  if (score <= 4) return 'Insuffisant'
  if (score <= 8) return 'Améliorable'
  return 'Expert'
}

// ── SALON ──────────────────────────────────────────────────────────────────

export async function creerSalon(codeS, totalQuestions, quizId = null) {
  if (!isFirebaseConfigured || !db) return
  await setDoc(doc(db, 'rooms', codeS), {
    statut: 'attente',
    questionCourante: -1,
    questionDemarreeA: null,
    totalQuestions,
    quizId,
    creeA: serverTimestamp()
  })
}

export async function lancerPartie(codeS) {
  if (!isFirebaseConfigured || !db) return
  await updateDoc(doc(db, 'rooms', codeS), {
    statut: 'en-cours',
    questionCourante: 0,
    questionDemarreeA: serverTimestamp()
  })
}

export async function passerQuestionSuivante(codeS, prochaineIndex, total) {
  if (!isFirebaseConfigured || !db) return
  if (prochaineIndex >= total) {
    await updateDoc(doc(db, 'rooms', codeS), { statut: 'termine', questionCourante: prochaineIndex })
  } else {
    await updateDoc(doc(db, 'rooms', codeS), { questionCourante: prochaineIndex, questionDemarreeA: serverTimestamp() })
  }
}

export async function terminerSalon(codeS) {
  if (!isFirebaseConfigured || !db) return
  await updateDoc(doc(db, 'rooms', codeS), { statut: 'termine' })
}

export async function lireRoom(codeS) {
  if (!isFirebaseConfigured || !db) return null
  try {
    const snap = await getDoc(doc(db, 'rooms', codeS))
    return snap.exists() ? snap.data() : null
  } catch { return null }
}

export function abonnerSalon(codeS, callback) {
  if (!isFirebaseConfigured || !db) return () => {}
  return onSnapshot(doc(db, 'rooms', codeS),
    snap => { if (snap.exists()) callback(snap.data()) },
    err => console.error('Erreur écoute salon:', err)
  )
}

// ── JOUEURS ────────────────────────────────────────────────────────────────

export async function inscrireJoueur(codeS, idUtilisateur, prenom) {
  if (!isFirebaseConfigured || !db) return
  await setDoc(doc(db, 'rooms', codeS, 'players', idUtilisateur), {
    idUtilisateur, prenom, reponses: {}, score: 0,
    statut: 'attente', groupe: 'En attente', tempsPasse: '00:00',
    derniereMiseAJour: serverTimestamp()
  })
}

export async function soumettreReponse(codeS, idUtilisateur, indiceQuestion, indiceChoisi, scoreTotal, estTermine, tempsPasse) {
  if (!isFirebaseConfigured || !db) return
  const ref = doc(db, 'rooms', codeS, 'players', idUtilisateur)
  const snap = await getDoc(ref)
  const reponsesActuelles = snap.exists() ? (snap.data().reponses || {}) : {}
  await updateDoc(ref, {
    reponses: { ...reponsesActuelles, [indiceQuestion]: indiceChoisi },
    score: scoreTotal,
    statut: estTermine ? 'termine' : 'en-cours',
    groupe: estTermine ? getGroupe(scoreTotal) : 'En cours',
    tempsPasse: estTermine ? tempsPasse : '00:00',
    derniereMiseAJour: serverTimestamp()
  })
}

export function abonnerJoueurs(codeS, callback) {
  if (!isFirebaseConfigured || !db) return () => {}
  return onSnapshot(collection(db, 'rooms', codeS, 'players'),
    snap => { const j = []; snap.forEach(d => j.push(d.data())); callback(j) },
    err => console.error('Erreur écoute joueurs:', err)
  )
}

// ── BIBLIOTHÈQUE DE QUIZ ───────────────────────────────────────────────────

export async function listerQuizzes() {
  if (!isFirebaseConfigured || !db) return []
  try {
    const snap = await getDocs(query(collection(db, 'quizzes'), orderBy('creeA', 'desc')))
    return snap.docs.map(d => ({ id: d.id, title: d.data().title, questionCount: d.data().questionCount, creeA: d.data().creeA }))
  } catch (e) {
    console.error('listerQuizzes:', e)
    return []
  }
}

export async function ajouterQuiz(rawData, title, questionCount) {
  if (!isFirebaseConfigured || !db) return null
  const ref = await addDoc(collection(db, 'quizzes'), {
    title, questionCount, rawData, creeA: serverTimestamp()
  })
  return ref.id
}

export async function chargerQuizParId(id) {
  if (!isFirebaseConfigured || !db) return null
  try {
    const snap = await getDoc(doc(db, 'quizzes', id))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  } catch { return null }
}

export async function supprimerQuiz(id) {
  if (!isFirebaseConfigured || !db) return
  await deleteDoc(doc(db, 'quizzes', id))
}

// ── LEGACY ─────────────────────────────────────────────────────────────────

export async function registerPlayer(roomId, userId, username) {
  return inscrireJoueur(roomId, userId, username)
}

export function subscribeToPlayers(roomId, callback) {
  return abonnerJoueurs(roomId, callback)
}
