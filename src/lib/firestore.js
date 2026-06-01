import {
  doc, setDoc, updateDoc, collection,
  onSnapshot, serverTimestamp
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'

function getGroup(score) {
  if (score <= 4) return 'Insuffisant'
  if (score <= 8) return 'Améliorable'
  return 'Expert'
}

export async function registerPlayer(roomId, userId, username) {
  if (!isFirebaseConfigured || !db) return
  const ref = doc(db, 'rooms', roomId, 'players', userId)
  await setDoc(ref, {
    userId,
    username,
    progress: 0,
    score: 0,
    status: 'En cours',
    group: 'En attente',
    timeSpent: '00:00',
    lastUpdated: serverTimestamp()
  })
}

export async function updateProgress(roomId, userId, progress, score, isFinished = false, timeSpent = '00:00') {
  if (!isFirebaseConfigured || !db) return
  const ref = doc(db, 'rooms', roomId, 'players', userId)
  await updateDoc(ref, {
    progress,
    score,
    status: isFinished ? 'Terminé' : 'En cours',
    group: isFinished || progress > 0 ? getGroup(score) : 'En attente',
    timeSpent,
    lastUpdated: serverTimestamp()
  })
}

export function subscribeToPlayers(roomId, callback) {
  if (!isFirebaseConfigured || !db) return () => {}
  const ref = collection(db, 'rooms', roomId, 'players')
  return onSnapshot(ref, (snapshot) => {
    const players = []
    snapshot.forEach(d => players.push(d.data()))
    callback(players)
  }, (err) => console.error('Firestore listen error:', err))
}
