import { Md, MdBlock } from './Md'

export function ScreenReview({ questions, answers, onBack }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-md">
        <div>
          <h3 className="font-extrabold text-slate-900 text-xl">Correction détaillée</h3>
          <p className="text-slate-500 text-xs">Explications didactiques pour chaque question.</p>
        </div>
        <button onClick={onBack} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl text-xs transition flex items-center space-x-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Retour aux résultats</span>
        </button>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
        {questions.map((q, index) => {
          const userAns = answers.find(a => a.questionId === q.id)
          const isCorrect = userAns?.isCorrect ?? false
          const chosenText = userAns?.chosenIndex != null ? q.options[userAns.chosenIndex] : 'Aucune réponse'
          const correctText = q.options[q.correctIndex]

          return (
            <div
              key={q.id}
              className={`p-5 rounded-2xl border-2 space-y-4 ${isCorrect ? 'border-emerald-100 bg-emerald-50/10' : 'border-rose-100 bg-rose-50/10'}`}
            >
              <div className="flex justify-between items-start gap-4">
                {q.category && (
                  <span className={`text-xs font-bold uppercase tracking-wider ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>{q.category}</span>
                )}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ml-auto ${isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {isCorrect ? '✓ Correct' : '✗ Erreur'}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm md:text-base">
                Question {index + 1} : <Md>{q.question}</Md>
              </h4>
              <div className="space-y-2 text-xs md:text-sm">
                <div className="flex items-start space-x-2">
                  <span className="font-semibold text-slate-500 min-w-[130px] shrink-0">Votre réponse :</span>
                  <span className={isCorrect ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                    <Md>{chosenText}</Md>
                  </span>
                </div>
                {!isCorrect && (
                  <div className="flex items-start space-x-2">
                    <span className="font-semibold text-slate-500 min-w-[130px] shrink-0">Réponse attendue :</span>
                    <span className="text-emerald-700 font-semibold"><Md>{correctText}</Md></span>
                  </div>
                )}
              </div>
              {q.explanation && (
                <div className="bg-white p-4 rounded-xl border border-slate-100 text-xs md:text-sm text-slate-600 leading-relaxed">
                  <span className="font-bold text-emerald-600 block text-[11px] uppercase tracking-wider mb-2">L'explication :</span>
                  <MdBlock>{q.explanation}</MdBlock>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
