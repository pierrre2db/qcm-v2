const DEFAULT_META = {
  badge: 'Multi-joueur en temps réel',
  theme: 'emerald',
  footer: '',
  footerLinks: []
}

function defaultGroups(total) {
  return [
    { maxScore: Math.floor(total * 0.4),  label: 'Insuffisant', color: 'red',   title: 'À retravailler ❌',      feedback: 'Des lacunes importantes. Relisez la matière et retentez !' },
    { maxScore: Math.floor(total * 0.75), label: 'Améliorable', color: 'amber', title: 'Bien, mais perfectible ⚠', feedback: 'Bon niveau général, mais quelques points à revoir en détail.' },
    { maxScore: 999,                      label: 'Expert',       color: 'green', title: 'Maîtrise parfaite ! ⭐',  feedback: 'Excellent ! Vous maîtrisez parfaitement ce sujet.' }
  ]
}

// Converts new Claude-generated format → internal app format.
// Old format (correctIndex / options array) passes through unchanged.
export function normalizeQuiz(data) {
  const isNewFormat = data.questions?.[0]?.bonne_reponse !== undefined
  if (!isNewFormat) return data

  const total = data.questions.length
  const LETTERS = ['A', 'B', 'C', 'D']

  return {
    meta: data.meta ?? { ...DEFAULT_META, title: data.titre_quiz ?? 'Quiz', subtitle: data.sous_titre ?? '' },
    groups: data.groups ?? defaultGroups(total),
    questions: data.questions.map(q => {
      const options = LETTERS.map(l => q.options?.[l]).filter(Boolean)
      const correctIndex = LETTERS.indexOf((q.bonne_reponse ?? '').toUpperCase())
      return {
        id: q.id,
        category: q.categorie ?? (q.difficulte ? `Difficulté ${q.difficulte}/5` : ''),
        question: q.question ?? '',
        options,
        correctIndex: correctIndex >= 0 ? correctIndex : 0,
        explanation: q.pourquoi ?? '',
        imageUrl: q.image ?? ''
      }
    })
  }
}
