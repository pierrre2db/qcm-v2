import { useRef, useState } from 'react'
import { normalizeQuiz } from '../lib/normalizeQuiz'
import { sauvegarderQuiz } from '../lib/firestore'

export function ScreenAdmin({ currentQuiz, onQuizLoaded, onBack }) {
  const fileRef = useRef(null)
  const [texte, setTexte] = useState('')
  const [preview, setPreview] = useState(null)
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(false)
  const [drag, setDrag] = useState(false)
  const [success, setSuccess] = useState(false)

  function parseAndPreview(text) {
    setErreur('')
    setPreview(null)
    setSuccess(false)
    try {
      const raw = JSON.parse(text)
      const normalized = normalizeQuiz(raw)
      if (!normalized.questions?.length) throw new Error('Aucune question trouvée dans le fichier.')
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
    reader.onload = e => {
      const text = e.target.result
      setTexte(text)
      parseAndPreview(text)
    }
    reader.readAsText(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.json') || file?.type === 'application/json') handleFile(file)
    else setErreur('Fichier .json requis.')
  }

  async function handleCharger() {
    if (!preview) return
    setLoading(true)
    try {
      await sauvegarderQuiz(preview.raw)
      onQuizLoaded(preview.normalized)
      setSuccess(true)
      setTexte('')
      setPreview(null)
    } catch (e) {
      setErreur('Erreur Firestore : ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Administration</h2>
          <p className="text-xs text-slate-400 mt-0.5">Gestion du contenu de l'application</p>
        </div>
        <button onClick={onBack} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl text-sm transition flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Retour</span>
        </button>
      </div>

      {/* Quiz actif */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md space-y-3">
        <h3 className="font-extrabold text-slate-900 text-lg">Quiz actif</h3>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 flex-1">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Titre</p>
            <p className="font-extrabold text-slate-900">{currentQuiz.meta.title}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Questions</p>
            <p className="text-3xl font-extrabold text-slate-900">{currentQuiz.questions.length}</p>
          </div>
        </div>
      </div>

      {/* Charger un nouveau quiz */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md space-y-5">
        <h3 className="font-extrabold text-slate-900 text-lg">Charger un nouveau quiz</h3>
        <p className="text-xs text-slate-500">Fichier JSON généré par Claude. Format nouveau (<code className="bg-slate-100 px-1 py-0.5 rounded">bonne_reponse</code>) ou ancien (<code className="bg-slate-100 px-1 py-0.5 rounded">correctIndex</code>) accepté.</p>

        {/* Drop zone */}
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
          <p className="font-semibold text-slate-500">Glissez un fichier .json ici</p>
          <p className="text-xs text-slate-400 mt-1">ou cliquez pour parcourir</p>
        </div>

        {/* Paste */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ou collez votre JSON</label>
          <textarea
            value={texte}
            onChange={handleTextChange}
            rows={7}
            placeholder='{"titre_quiz": "Mon Quiz", "questions": [...]}'
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-y transition"
          />
        </div>

        {/* Error */}
        {erreur && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-sm text-rose-700 font-medium">⚠ {erreur}</div>
        )}

        {/* Success */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm text-emerald-700 font-bold">✓ Quiz chargé et sauvegardé avec succès !</div>
        )}

        {/* Preview */}
        {preview && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Aperçu</p>
            <p className="font-extrabold text-slate-900">{preview.normalized.meta.title}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-white border border-emerald-200 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                {preview.normalized.questions.length} questions
              </span>
            </div>
            <p className="text-xs text-slate-500 italic">
              Q1 : {preview.normalized.questions[0]?.question?.slice(0, 100)}…
            </p>
          </div>
        )}

        <button
          onClick={handleCharger}
          disabled={!preview || loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition shadow-md"
        >
          {loading ? 'Sauvegarde en cours...' : 'Charger ce quiz →'}
        </button>
      </div>
    </div>
  )
}
