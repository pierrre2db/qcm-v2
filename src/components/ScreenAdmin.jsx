import { useRef, useState } from 'react'
import { normalizeQuiz } from '../lib/normalizeQuiz'
import { ajouterQuiz, supprimerQuiz } from '../lib/firestore'

function formatDate(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ScreenAdmin({ quizList, onQuizAdded, onQuizDeleted, onBack }) {
  const fileRef = useRef(null)
  const [texte, setTexte] = useState('')
  const [preview, setPreview] = useState(null)
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(false)
  const [drag, setDrag] = useState(false)
  const [success, setSuccess] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  function parseAndPreview(text) {
    setErreur(''); setPreview(null); setSuccess(false)
    try {
      const raw = JSON.parse(text)
      const normalized = normalizeQuiz(raw)
      if (!normalized.questions?.length) throw new Error('Aucune question trouvée.')
      setPreview({ raw, normalized })
    } catch (e) {
      setErreur(e.message || 'JSON invalide.')
    }
  }

  function handleTextChange(e) {
    setTexte(e.target.value)
    if (e.target.value.trim()) parseAndPreview(e.target.value)
    else { setPreview(null); setErreur('') }
  }

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => { const t = e.target.result; setTexte(t); parseAndPreview(t) }
    reader.readAsText(file)
  }

  function handleDrop(e) {
    e.preventDefault(); setDrag(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.json') || file?.type === 'application/json') handleFile(file)
    else setErreur('Fichier .json requis.')
  }

  async function handleAjouter() {
    if (!preview) return
    setLoading(true)
    try {
      const id = await ajouterQuiz(
        preview.raw,
        preview.normalized.meta.title,
        preview.normalized.questions.length
      )
      onQuizAdded({ id, title: preview.normalized.meta.title, questionCount: preview.normalized.questions.length, normalized: preview.normalized })
      setSuccess(true); setTexte(''); setPreview(null)
    } catch (e) {
      setErreur('Erreur Firestore : ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSupprimer(id) {
    setDeletingId(id)
    try {
      await supprimerQuiz(id)
      onQuizDeleted(id)
    } catch (e) {
      console.error(e)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Administration</h2>
          <p className="text-xs text-slate-400 mt-0.5">Bibliothèque de quiz</p>
        </div>
        <button onClick={onBack} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl text-sm transition flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Retour</span>
        </button>
      </div>

      {/* Quiz library */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md space-y-4">
        <h3 className="font-extrabold text-slate-900 text-lg">Quiz disponibles</h3>
        {quizList.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Aucun quiz dans la base. Ajoutez-en un ci-dessous.</p>
        ) : (
          <div className="space-y-2">
            {quizList.map(q => (
              <div key={q.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4">
                <div>
                  <p className="font-bold text-slate-900">{q.title}</p>
                  <p className="text-xs text-slate-400">{q.questionCount} questions{q.creeA ? ` · ${formatDate(q.creeA)}` : ''}</p>
                </div>
                <button
                  onClick={() => handleSupprimer(q.id)}
                  disabled={deletingId === q.id}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold p-2.5 rounded-xl transition disabled:opacity-50"
                  title="Supprimer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add quiz */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md space-y-5">
        <h3 className="font-extrabold text-slate-900 text-lg">Ajouter un quiz</h3>
        <p className="text-xs text-slate-500">JSON généré par Claude — format <code className="bg-slate-100 px-1 py-0.5 rounded">bonne_reponse</code> ou <code className="bg-slate-100 px-1 py-0.5 rounded">correctIndex</code>.</p>

        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition
            ${drag ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}
        >
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="font-semibold text-slate-500">Glissez un fichier .json</p>
          <p className="text-xs text-slate-400 mt-1">ou cliquez pour parcourir</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ou collez votre JSON</label>
          <textarea
            value={texte}
            onChange={handleTextChange}
            rows={6}
            placeholder='{"titre_quiz": "Mon Quiz", "questions": [...]}'
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-y transition"
          />
        </div>

        {erreur && <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-sm text-rose-700 font-medium">⚠ {erreur}</div>}
        {success && <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm text-emerald-700 font-bold">✓ Quiz ajouté à la bibliothèque !</div>}

        {preview && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Aperçu</p>
            <p className="font-extrabold text-slate-900">{preview.normalized.meta.title}</p>
            <div className="flex gap-2 text-xs">
              <span className="bg-white border border-emerald-200 text-emerald-800 font-bold px-2.5 py-1 rounded-full">{preview.normalized.questions.length} questions</span>
            </div>
            <p className="text-xs text-slate-500 italic">Q1 : {preview.normalized.questions[0]?.question?.slice(0, 100)}…</p>
          </div>
        )}

        <button
          onClick={handleAjouter}
          disabled={!preview || loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition shadow-md"
        >
          {loading ? 'Sauvegarde...' : 'Ajouter à la bibliothèque →'}
        </button>
      </div>
    </div>
  )
}
