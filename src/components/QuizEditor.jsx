import { useState, useRef } from 'react'
import { uploadQuizImage, ACCEPTED_IMAGE_TYPES, ACCEPTED_IMAGE_LABEL } from '../lib/imageUpload'

const LETTERS = ['A', 'B', 'C', 'D']

function emptyQuestion(id) {
  return { _id: id, question: '', optionA: '', optionB: '', optionC: '', optionD: '', correct: 0, category: '', explanation: '', imageUrl: '' }
}

function buildRawData(title, questions) {
  return {
    titre_quiz: title,
    questions: questions.map((q, i) => ({
      id: i + 1,
      difficulte: 3,
      question: q.question,
      options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
      bonne_reponse: LETTERS[q.correct],
      pourquoi: q.explanation,
      ...(q.category ? { categorie: q.category } : {}),
      ...(q.imageUrl ? { image: q.imageUrl } : {})
    }))
  }
}

function loadFromRaw(rawData) {
  if (!rawData?.questions) return { title: '', questions: [emptyQuestion(0)] }
  const title = rawData.titre_quiz ?? rawData.meta?.title ?? ''
  const questions = rawData.questions.map((q, i) => {
    // handle both raw format (bonne_reponse) and normalized (correctIndex + options array)
    const isBonneReponse = q.bonne_reponse !== undefined
    const opts = isBonneReponse
      ? { A: q.options?.A ?? '', B: q.options?.B ?? '', C: q.options?.C ?? '', D: q.options?.D ?? '' }
      : { A: q.options?.[0] ?? '', B: q.options?.[1] ?? '', C: q.options?.[2] ?? '', D: q.options?.[3] ?? '' }
    const correct = isBonneReponse
      ? LETTERS.indexOf((q.bonne_reponse ?? 'A').toUpperCase())
      : (q.correctIndex ?? 0)
    return {
      _id: i,
      question: q.question ?? '',
      optionA: opts.A,
      optionB: opts.B,
      optionC: opts.C,
      optionD: opts.D,
      correct: correct >= 0 ? correct : 0,
      category: q.categorie ?? q.category ?? '',
      explanation: q.pourquoi ?? q.explanation ?? '',
      imageUrl: q.image ?? q.imageUrl ?? ''
    }
  })
  return { title, questions }
}

// ── IMAGE FIELD ───────────────────────────────────────────────────────────────
function ImageField({ value, questionKey, onChange }) {
  const fileRef = useRef(null)
  const [progress, setProgress] = useState(null)   // null | 0-100
  const [uploadErr, setUploadErr] = useState('')
  const [showUrl, setShowUrl] = useState(false)
  const [drag, setDrag] = useState(false)

  async function handleFile(file) {
    if (!file) return
    setUploadErr('')
    setProgress(0)
    try {
      const url = await uploadQuizImage(file, questionKey, pct => setProgress(pct))
      onChange(url)
    } catch (e) {
      setUploadErr(e.message)
    } finally {
      setProgress(null)
    }
  }

  function handleDrop(e) {
    e.preventDefault(); setDrag(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Image <span className="normal-case font-normal text-slate-400">— optionnelle</span>
        </label>
        <button
          type="button"
          onClick={() => setShowUrl(v => !v)}
          className="text-[10px] text-slate-400 hover:text-blue-500 transition font-semibold underline underline-offset-2"
        >
          {showUrl ? '← Uploader un fichier' : 'Entrer une URL →'}
        </button>
      </div>

      {showUrl ? (
        /* URL fallback */
        <div className="flex gap-2">
          <input
            type="url"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="https://exemple.com/image.jpg"
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-400 transition"
          />
          {value && (
            <button type="button" onClick={() => onChange('')}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl transition text-xs font-bold shrink-0"
            >✕</button>
          )}
        </div>
      ) : (
        /* Upload zone */
        value ? (
          /* Preview + replace */
          <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            <img src={value} alt="Aperçu" className="max-h-44 w-full object-contain" />
            <button
              type="button"
              onClick={() => { onChange(''); fileRef.current && (fileRef.current.value = '') }}
              className="absolute top-2 right-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow transition"
            >✕ Retirer</button>
          </div>
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            onClick={() => progress === null && fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center transition cursor-pointer
              ${drag ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
          >
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
              className="hidden"
              onChange={e => handleFile(e.target.files[0])}
            />
            {progress !== null ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-blue-600">Upload en cours… {progress}%</p>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : (
              <>
                <div className="text-2xl mb-1">🖼️</div>
                <p className="text-xs font-semibold text-slate-500">Glissez ou cliquez pour uploader</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{ACCEPTED_IMAGE_LABEL}</p>
                <p className="text-[10px] text-slate-400">SVG vectoriel passé tel quel · Raster redimensionné → WebP</p>
              </>
            )}
          </div>
        )
      )}

      {uploadErr && (
        <p className="text-xs text-rose-600 font-medium flex items-center gap-1">⚠ {uploadErr}</p>
      )}
    </div>
  )
}

// ── QUIZ EDITOR ────────────────────────────────────────────────────────────────
export function QuizEditor({ initialRawData = null, editingId = null, onSave, onCancel }) {
  const loaded = loadFromRaw(initialRawData)
  const [title, setTitle] = useState(loaded.title)
  const [questions, setQuestions] = useState(loaded.questions)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expandedIdx, setExpandedIdx] = useState(0)
  const [nextId, setNextId] = useState(loaded.questions.length)

  function updateQuestion(idx, field, value) {
    setQuestions(qs => qs.map((q, i) => i === idx ? { ...q, [field]: value } : q))
  }

  function addQuestion() {
    const id = nextId
    setNextId(id + 1)
    setQuestions(qs => [...qs, emptyQuestion(id)])
    setExpandedIdx(questions.length)
  }

  function removeQuestion(idx) {
    if (questions.length === 1) return
    setQuestions(qs => qs.filter((_, i) => i !== idx))
    setExpandedIdx(i => Math.min(i, questions.length - 2))
  }

  function moveQuestion(idx, dir) {
    const next = idx + dir
    if (next < 0 || next >= questions.length) return
    setQuestions(qs => {
      const arr = [...qs]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
    setExpandedIdx(next)
  }

  async function handleSave() {
    setError('')
    if (!title.trim()) { setError('Le titre du quiz est requis.'); return }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question.trim()) { setError(`Q${i + 1} : la question est vide.`); setExpandedIdx(i); return }
      if (!q.optionA.trim() || !q.optionB.trim()) { setError(`Q${i + 1} : au moins les options A et B sont requises.`); setExpandedIdx(i); return }
    }
    setSaving(true)
    try {
      const rawData = buildRawData(title.trim(), questions)
      await onSave({ rawData, title: title.trim(), questionCount: questions.length, editingId })
    } catch (e) {
      setError('Erreur sauvegarde : ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 text-lg">
          {editingId ? '✏️ Modifier le quiz' : '➕ Nouveau quiz'}
        </h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition text-sm font-semibold flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Annuler
        </button>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Titre du quiz *</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ex: Hygiène des Produits Frais"
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
        />
      </div>

      {/* Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{questions.length} question{questions.length > 1 ? 's' : ''}</label>
          <button
            onClick={addQuestion}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-sm px-3 py-1.5 rounded-xl transition border border-emerald-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter une question
          </button>
        </div>

        {questions.map((q, idx) => {
          const isOpen = expandedIdx === idx
          const isValid = q.question.trim() && q.optionA.trim() && q.optionB.trim()
          return (
            <div key={q._id} className={`border-2 rounded-2xl overflow-hidden transition-all ${isOpen ? 'border-emerald-400' : isValid ? 'border-slate-200' : 'border-amber-300'}`}>

              {/* Question header */}
              <div
                className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none ${isOpen ? 'bg-emerald-50' : 'bg-slate-50 hover:bg-slate-100'}`}
                onClick={() => setExpandedIdx(isOpen ? -1 : idx)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${isOpen ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{idx + 1}</span>
                  <span className="text-sm font-semibold text-slate-700 truncate">
                    {q.question.trim() || <span className="text-slate-400 italic">Question vide…</span>}
                  </span>
                  {!isValid && <span className="shrink-0 text-amber-500 text-xs">⚠</span>}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button onClick={e => { e.stopPropagation(); moveQuestion(idx, -1) }} disabled={idx === 0}
                    className="p-1 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition" title="Monter">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button onClick={e => { e.stopPropagation(); moveQuestion(idx, 1) }} disabled={idx === questions.length - 1}
                    className="p-1 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition" title="Descendre">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <button onClick={e => { e.stopPropagation(); removeQuestion(idx) }} disabled={questions.length === 1}
                    className="p-1 hover:bg-rose-100 rounded-lg disabled:opacity-30 transition text-rose-500" title="Supprimer">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              {/* Question body */}
              {isOpen && (
                <div className="p-4 space-y-4 bg-white">

                  {/* Question text */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question *</label>
                    <textarea
                      rows={2}
                      value={q.question}
                      onChange={e => updateQuestion(idx, 'question', e.target.value)}
                      placeholder="Écrivez votre question ici…"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none transition"
                    />
                  </div>

                  {/* Options */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Options de réponse *</label>
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">👆 Cliquez sur la lettre = bonne réponse</span>
                    </div>
                    <div className="space-y-2">
                      {(['optionA', 'optionB', 'optionC', 'optionD']).map((field, li) => {
                        const isCorrect = q.correct === li
                        return (
                          <div key={field} className={`flex items-center gap-2.5 rounded-xl border-2 transition ${isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                            <button
                              type="button"
                              onClick={() => updateQuestion(idx, 'correct', li)}
                              className={`w-11 self-stretch flex items-center justify-center rounded-l-xl shrink-0 transition font-black text-sm border-r-2
                                ${isCorrect
                                  ? 'bg-emerald-500 text-white border-emerald-400'
                                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-emerald-100 hover:text-emerald-700 hover:border-emerald-200'}`}
                              title="Marquer comme bonne réponse"
                            >
                              {isCorrect ? '✓' : LETTERS[li]}
                            </button>
                            <input
                              type="text"
                              value={q[field]}
                              onChange={e => updateQuestion(idx, field, e.target.value)}
                              placeholder={`Option ${LETTERS[li]}${li < 2 ? ' (requise)' : ' (optionnelle)'}`}
                              className={`flex-1 py-2.5 pr-3 bg-transparent text-sm focus:outline-none placeholder-slate-300 font-medium ${isCorrect ? 'text-emerald-800' : 'text-slate-700'}`}
                            />
                            {isCorrect && <span className="text-[10px] text-emerald-600 font-black shrink-0 pr-3 uppercase tracking-wide">✓ Correcte</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Category + Explanation */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catégorie</label>
                      <input
                        type="text"
                        value={q.category}
                        onChange={e => updateQuestion(idx, 'category', e.target.value)}
                        placeholder="Ex: Températures"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Explication (correction)</label>
                      <input
                        type="text"
                        value={q.explanation}
                        onChange={e => updateQuestion(idx, 'explanation', e.target.value)}
                        placeholder="Pourquoi cette réponse ?"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 transition"
                      />
                    </div>
                  </div>

                  {/* Image upload */}
                  <ImageField
                    value={q.imageUrl}
                    questionKey={`q${q._id}`}
                    onChange={url => updateQuestion(idx, 'imageUrl', url)}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add question CTA bottom */}
      <button
        onClick={addQuestion}
        className="w-full border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-2xl py-3 text-sm font-bold text-slate-400 hover:text-emerald-600 transition flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        Ajouter une question
      </button>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 font-medium">
          ⚠ {error}
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 text-sm"
      >
        {saving ? (
          <><span className="animate-spin">⏳</span> Sauvegarde…</>
        ) : (
          <>{editingId ? '💾 Mettre à jour le quiz' : '💾 Sauvegarder le quiz'} ({questions.length} Q)</>
        )}
      </button>

    </div>
  )
}
