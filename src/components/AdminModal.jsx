import { useRef, useState } from 'react'
import { normalizeQuiz } from '../lib/normalizeQuiz'
import { sauvegarderQuiz } from '../lib/firestore'

export function AdminModal({ onClose, onQuizLoaded }) {
  const fileRef = useRef(null)
  const [texte, setTexte] = useState('')
  const [preview, setPreview] = useState(null)
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(false)
  const [drag, setDrag] = useState(false)

  function parseAndPreview(text) {
    setErreur('')
    setPreview(null)
    try {
      const raw = JSON.parse(text)
      const normalized = normalizeQuiz(raw)
      if (!normalized.questions?.length) throw new Error('Aucune question trouvée dans le fichier.')
      setPreview({ raw, normalized })
      return true
    } catch (e) {
      setErreur(e.message || 'JSON invalide.')
      return false
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
    if (file?.type === 'application/json' || file?.name.endsWith('.json')) handleFile(file)
    else setErreur('Fichier .json requis.')
  }

  async function handleCharger() {
    if (!preview) return
    setLoading(true)
    try {
      await sauvegarderQuiz(preview.raw)
      onQuizLoaded(preview.normalized)
      onClose()
    } catch (e) {
      setErreur('Erreur Firestore : ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Charger un quiz</h2>
            <p className="text-xs text-slate-400 mt-0.5">Fichier JSON généré par Claude</p>
          </div>
          <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 p-2 rounded-xl transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition
              ${drag ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}
          >
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-semibold text-slate-500">Glissez un fichier .json ici</p>
            <p className="text-xs text-slate-400">ou cliquez pour parcourir</p>
          </div>

          {/* Paste area */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ou collez votre JSON</label>
            <textarea
              value={texte}
              onChange={handleTextChange}
              rows={6}
              placeholder='{"titre_quiz": "Mon Quiz", "questions": [...]}'
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none transition"
            />
          </div>

          {/* Error */}
          {erreur && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-sm text-rose-700 font-medium">
              ⚠ {erreur}
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Aperçu du quiz</p>
              <p className="font-extrabold text-slate-900">{preview.normalized.meta.title}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-white border border-emerald-200 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                  {preview.normalized.questions.length} questions
                </span>
                {preview.normalized.questions[0]?.category && (
                  <span className="bg-white border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full">
                    {preview.normalized.questions[0].category}
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-600 font-medium">
                Q1 : {preview.normalized.questions[0]?.question?.slice(0, 80)}...
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl transition text-sm">
              Annuler
            </button>
            <button
              onClick={handleCharger}
              disabled={!preview || loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-2xl transition shadow-md text-sm"
            >
              {loading ? 'Chargement...' : 'Charger ce quiz →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
