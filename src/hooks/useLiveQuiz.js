import { useEffect, useState, useCallback } from 'react'
import { abonnerSalon, soumettreReponse } from '../lib/firestore'

export function useLiveQuiz(codeS, userId, questions) {
  const [salon, setSalon] = useState(null)
  const [reponsesDonnees, setReponsesDonnees] = useState({})
  const [startTime] = useState(() => new Date())

  useEffect(() => {
    if (!codeS) return
    const unsub = abonnerSalon(codeS, setSalon)
    return unsub
  }, [codeS])

  const indiceQuestion = salon?.questionCourante ?? -1
  const questionCourante = indiceQuestion >= 0 ? questions[indiceQuestion] : null
  const aDejaRepondu = indiceQuestion >= 0 && reponsesDonnees[indiceQuestion] !== undefined
  const statut = salon?.statut ?? 'attente'
  const questionDemarreeA = salon?.questionDemarreeA?.toDate?.() ?? null

  const soumettre = useCallback(async (indiceChoisi) => {
    if (!questionCourante || aDejaRepondu) return

    const estCorrect = indiceChoisi === questionCourante.correctIndex
    const nouvellesReponses = { ...reponsesDonnees, [indiceQuestion]: indiceChoisi }
    setReponsesDonnees(nouvellesReponses)

    const score = Object.entries(nouvellesReponses).filter(([idx, choix]) => {
      const q = questions[parseInt(idx)]
      return q && choix === q.correctIndex
    }).length

    const estTermine = statut === 'termine' || indiceQuestion === questions.length - 1

    const diff = Math.floor((new Date() - startTime) / 1000)
    const m = String(Math.floor(diff / 60)).padStart(2, '0')
    const s = String(diff % 60).padStart(2, '0')
    const tempsPasse = `${m}:${s}`

    await soumettreReponse(codeS, userId, indiceQuestion, indiceChoisi, score, estTermine, tempsPasse)

    return { estCorrect, score, estTermine, tempsPasse }
  }, [questionCourante, aDejaRepondu, reponsesDonnees, indiceQuestion, questions, statut, codeS, userId, startTime])

  const scoreActuel = Object.entries(reponsesDonnees).filter(([idx, choix]) => {
    const q = questions[parseInt(idx)]
    return q && choix === q.correctIndex
  }).length

  const reponsesFinales = questions.map((q, idx) => ({
    questionId: q.id,
    chosenIndex: reponsesDonnees[idx] ?? null,
    isCorrect: reponsesDonnees[idx] !== undefined && reponsesDonnees[idx] === q.correctIndex
  }))

  return {
    salon,
    statut,
    indiceQuestion,
    questionCourante,
    aDejaRepondu,
    questionDemarreeA,
    reponsesDonnees,
    scoreActuel,
    reponsesFinales,
    soumettre
  }
}
