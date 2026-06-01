import { useState, useCallback } from 'react'

export function useQuizStore(questions) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [answers, setAnswers] = useState([])
  const [startTime] = useState(() => new Date())

  const currentQuestion = questions[currentIndex]
  const totalQuestions = questions.length
  const isLast = currentIndex === totalQuestions - 1

  const select = useCallback((idx) => setSelectedOption(idx), [])

  const confirm = useCallback(() => {
    if (selectedOption === null) return null
    const isCorrect = selectedOption === currentQuestion.correctIndex
    const newAnswers = [...answers, {
      questionId: currentQuestion.id,
      chosenIndex: selectedOption,
      isCorrect
    }]
    setAnswers(newAnswers)
    setSelectedOption(null)

    const score = newAnswers.filter(a => a.isCorrect).length

    if (!isLast) {
      setCurrentIndex(i => i + 1)
      return { done: false, score, answers: newAnswers }
    }
    const endTime = new Date()
    const diff = Math.floor((endTime - startTime) / 1000)
    const mins = String(Math.floor(diff / 60)).padStart(2, '0')
    const secs = String(diff % 60).padStart(2, '0')
    return { done: true, score, answers: newAnswers, timeSpent: `${mins}:${secs}` }
  }, [selectedOption, currentQuestion, answers, isLast, startTime])

  const reset = useCallback(() => {
    setCurrentIndex(0)
    setSelectedOption(null)
    setAnswers([])
  }, [])

  return {
    currentQuestion,
    currentIndex,
    totalQuestions,
    selectedOption,
    answers,
    startTime,
    select,
    confirm,
    reset
  }
}
