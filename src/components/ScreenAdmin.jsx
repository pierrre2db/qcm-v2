import { useRef, useState } from 'react'
import { normalizeQuiz } from '../lib/normalizeQuiz'
import { uploadToCloudinary } from '../lib/cloudinary'
import { ajouterQuiz, supprimerQuiz, chargerQuizParId, mettreAJourQuiz } from '../lib/firestore'

function formatDate(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function buildPrompt(sujet, nombre) {
  const s = sujet || '[SUJET]'
  const n = nombre || 10
  return `En te basant exclusivement sur les documents sources de ce notebook, génère exactement ${n} questions de quiz sur le thème "${s}".

Utilise strictement ce format JSON, sans aucun texte avant ni après :

{
  "titre_quiz": "${s}",
  "questions": [
    {
      "id": 1,
      "difficulte": 3,
      "question": "Question avec **mots importants** en gras ?",
      "options": {
        "A": "Première réponse",
        "B": "Deuxième réponse",
        "C": "Troisième réponse",
        "D": "Quatrième réponse"
      },
      "bonne_reponse": "A",
      "pourquoi": "Explication tirée des documents. Mets en **gras** les points clés.\\n- Point important 1\\n- Point important 2"
    }
  ]
}

Règles obligatoires :
- Toutes les questions et réponses doivent être ancrées dans les documents sources
- Génère exactement ${n} questions couvrant des aspects variés du thème "${s}"
- Utilise **gras** et *italique* pour les termes importants dans les questions, options et explications
- La difficulté va de 1 (très facile) à 5 (expert) — varie les niveaux
- L'explication (pourquoi) doit citer ou paraphraser la source du document
- JSON parfaitement valide : retours à la ligne = \\n, guillemets = \\"
- Réponds UNIQUEMENT avec le JSON brut, sans balises Markdown \`\`\``
}

const QUESTION_TEMPLATE = {
  difficulte: 3,
  question: "Nouvelle question ?",
  options: { A: "Option A", B: "Option B", C: "Option C", D: "Option D" },
  bonne_reponse: "A",
  pourquoi: "Explication de la bonne réponse."
}

const JSON_FORMAT_EXEMPLE = `{
  "titre_quiz": "Titre de mon quiz",
  "questions": [
    {
      "id": 1,
      "difficulte": 3,
      "question": "Quelle est la température **maximale** de conservation de la viande hachée ?",
      "options": {
        "A": "**+2°C** maximum",
        "B": "+4°C maximum",
        "C": "+7°C maximum",
        "D": "+10°C maximum"
      },
      "bonne_reponse": "A",
      "pourquoi": "La viande hachée est **très sensible** aux bactéries.\\n- Température max : **+2°C**\\n- En dessous de 0°C : conservation longue durée"
    }
  ]
}`

export function ScreenAdmin({ quizList, onQuizAdded, onQuizDeleted, onQuizUpdated, onBack, titreAccueil = 'À vos Téléphones / PC !', onSauvegarderSettings }) {
  const fileRef = useRef(null)

  // Settings
  const [titreInput, setTitreInput] = useState(titreAccueil)
  const [settingsSaved, setSettingsSaved] = useState(false)

  async function handleSauvegarderSettings() {
    await onSauvegarderSettings?.({ titreAccueil: titreInput.trim() || 'À vos Téléphones / PC !' })
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  // Prompt builder
  const [sujet, setSujet] = useState('')
  const [nombre, setNombre] = useState(10)
  const [promptCopied, setPromptCopied] = useState(false)
  const [showFormat, setShowFormat] = useState(false)

  // Upload/edit quiz JSON
  const [texte, setTexte] = useState('')
  const [preview, setPreview] = useState(null)
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(false)
  const [drag, setDrag] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [loadingEditId, setLoadingEditId] = useState(null)

  // Edit mode: null = create mode, { id } = edit mode
  const [editingQuiz, setEditingQuiz] = useState(null)

  // Images par question : { [questionIndex]: { url, uploading, error } }
  const [questionImages, setQuestionImages] = useState({})

  async function copyPrompt() {
    try { await navigator.clipboard.writeText(buildPrompt(sujet, nombre)) } catch {
      const el = document.createElement('textarea')
      el.value = buildPrompt(sujet, nombre)
      document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
    }
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }

  function parseAndPreview(text) {
    setErreur(''); setPreview(null); setSuccessMsg(''); setQuestionImages({})
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

  async function handleImageUpload(questionIndex, file) {
    if (!file) return
    setQuestionImages(prev => ({ ...prev, [questionIndex]: { uploading: true, url: null, error: null } }))
    try {
      const url = await uploadToCloudinary(file)
      setQuestionImages(prev => ({ ...prev, [questionIndex]: { uploading: false, url, error: null } }))
    } catch (e) {
      setQuestionImages(prev => ({ ...prev, [questionIndex]: { uploading: false, url: null, error: e.message } }))
    }
  }

  function removeImage(questionIndex) {
    setQuestionImages(prev => {
      const next = { ...prev }
      delete next[questionIndex]
      return next
    })
  }

  // Add a blank question to current JSON
  function handleAddQuestion() {
    if (!preview) return
    try {
      const raw = JSON.parse(texte)
      const newQ = { ...QUESTION_TEMPLATE, id: raw.questions.length + 1 }
      raw.questions = [...raw.questions, newQ]
      const newText = JSON.stringify(raw, null, 2)
      setTexte(newText)
      parseAndPreview(newText)
    } catch (e) {
      setErreur('Impossible d\'ajouter : JSON invalide.')
    }
  }

  // Remove last question from current JSON
  function handleRemoveQuestion() {
    if (!preview || preview.raw.questions.length <= 1) return
    try {
      const raw = JSON.parse(texte)
      raw.questions = raw.questions.slice(0, -1)
      const newText = JSON.stringify(raw, null, 2)
      setTexte(newText)
      parseAndPreview(newText)
      // Remove image for deleted question index
      setQuestionImages(prev => {
        const next = { ...prev }
        delete next[raw.questions.length]
        return next
      })
    } catch (e) {
      setErreur('Impossible de supprimer : JSON invalide.')
    }
  }

  // Load quiz into edit mode
  async function handleEdit(quiz) {
    setLoadingEditId(quiz.id)
    try {
      const data = await chargerQuizParId(quiz.id)
      if (!data?.rawData) throw new Error('Données introuvables.')
      const text = JSON.stringify(data.rawData, null, 2)
      setTexte(text)
      parseAndPreview(text)
      setEditingQuiz({ id: quiz.id })
      setSuccessMsg('')
      // Scroll to form
      setTimeout(() => {
        document.getElementById('quiz-form-section')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (e) {
      setErreur('Erreur chargement quiz : ' + e.message)
    } finally {
      setLoadingEditId(null)
    }
  }

  function handleCancelEdit() {
    setEditingQuiz(null)
    setTexte(''); setPreview(null); setErreur(''); setSuccessMsg(''); setQuestionImages({})
  }

  async function handleSauvegarder() {
    if (!preview) return
    setLoading(true)
    try {
      // Merge imageUrls into raw data
      const rawWithImages = {
        ...preview.raw,
        questions: preview.raw.questions.map((q, idx) => ({
          ...q,
          imageUrl: questionImages[idx]?.url ?? q.imageUrl ?? null
        }))
      }
      if (editingQuiz) {
        // UPDATE existing quiz
        await mettreAJourQuiz(
          editingQuiz.id,
          rawWithImages,
          preview.normalized.meta.title,
          preview.normalized.questions.length
        )
        onQuizUpdated?.({ id: editingQuiz.id, title: preview.normalized.meta.title, questionCount: preview.normalized.questions.length })
        setSuccessMsg('mis à jour')
        setEditingQuiz(null)
        setTexte(''); setPreview(null); setQuestionImages({})
      } else {
        // CREATE new quiz
        const id = await ajouterQuiz(
          rawWithImages,
          preview.normalized.meta.title,
          preview.normalized.questions.length
        )
        onQuizAdded({ id, title: preview.normalized.meta.title, questionCount: preview.normalized.questions.length })
        setSuccessMsg('ajouté'); setTexte(''); setPreview(null); setQuestionImages({})
      }
    } catch (e) {
      setErreur('Erreur Firestore : ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSupprimer(id) {
    setDeletingId(id)
    try { await supprimerQuiz(id); onQuizDeleted(id) }
    catch (e) { console.error(e) }
    finally { setDeletingId(null) }
  }

  const prompt = buildPrompt(sujet, nombre)
  const isEditing = !!editingQuiz

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

      {/* ── PARAMÈTRES AFFICHAGE ── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md space-y-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-lg">Paramètres d'affichage</h3>
          <p className="text-xs text-slate-500 mt-0.5">Texte affiché en grand sur l'écran d'accueil projeté aux élèves.</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Titre accueil</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={titreInput}
              onChange={e => setTitreInput(e.target.value)}
              placeholder="À vos Téléphones / PC !"
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition text-sm"
            />
            <button
              onClick={handleSauvegarderSettings}
              className={`font-bold py-2.5 px-5 rounded-xl text-sm transition whitespace-nowrap ${
                settingsSaved ? 'bg-emerald-500 text-white' : 'bg-slate-900 hover:bg-slate-700 text-white'}`}
            >
              {settingsSaved ? '✓ Sauvegardé' : 'Sauvegarder'}
            </button>
          </div>
          <p className="text-xs text-slate-400">Défaut : <span className="font-mono">À vos Téléphones / PC !</span></p>
        </div>
      </div>

      {/* ── GENERATE WITH NOTEBOOKLM ── */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl shadow-xl space-y-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg">Générer un quiz avec NotebookLM</h3>
            <p className="text-slate-400 text-xs mt-0.5">Remplis le sujet → copie le prompt → colle dans NotebookLM → recupère le JSON</p>
          </div>
          <button
            onClick={() => setShowFormat(v => !v)}
            title="Format JSON & exemples"
            className="bg-white/10 hover:bg-white/20 text-white font-bold w-9 h-9 rounded-xl transition flex items-center justify-center text-sm"
          >
            ?
          </button>
        </div>

        {showFormat && (
          <div className="bg-slate-950/50 rounded-2xl p-4 space-y-3 text-sm">
            <p className="font-bold text-emerald-400 text-xs uppercase tracking-wider">Format JSON attendu</p>
            <pre className="text-slate-300 text-xs font-mono whitespace-pre-wrap overflow-auto max-h-64 leading-relaxed">{JSON_FORMAT_EXEMPLE}</pre>
            <div className="border-t border-white/10 pt-3 space-y-1 text-xs text-slate-400">
              <p><strong className="text-white">bonne_reponse</strong> : lettre A, B, C ou D</p>
              <p><strong className="text-white">difficulte</strong> : 1 (facile) → 5 (expert)</p>
              <p><strong className="text-white">Markdown</strong> : **gras**, *italique*, - listes dans question/options/pourquoi</p>
              <p><strong className="text-white">imageUrl</strong> : optionnel — ajouté via le formulaire après import</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sujet du quiz</label>
            <input
              type="text"
              value={sujet}
              onChange={e => setSujet(e.target.value)}
              placeholder="ex: Hygiène alimentaire AFSCA"
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 font-medium focus:outline-none focus:border-emerald-400 transition text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nb questions</label>
            <input
              type="number"
              min={3} max={50}
              value={nombre}
              onChange={e => setNombre(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white font-bold focus:outline-none focus:border-emerald-400 transition text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prompt généré</label>
          <pre className="bg-slate-950/60 rounded-2xl p-4 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{prompt}</pre>
        </div>

        <button
          onClick={copyPrompt}
          className={`w-full font-bold py-3.5 rounded-2xl transition shadow-md flex items-center justify-center space-x-2 text-sm
            ${promptCopied ? 'bg-emerald-500 text-white' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
        >
          {promptCopied ? (
            <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg><span>Copié !</span></>
          ) : (
            <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg><span>Copier le prompt</span></>
          )}
        </button>
      </div>

      {/* ── QUIZ LIBRARY ── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md space-y-4">
        <h3 className="font-extrabold text-slate-900 text-lg">Quiz disponibles</h3>
        {quizList.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Aucun quiz dans la base. Ajoutez-en un ci-dessous.</p>
        ) : (
          <div className="space-y-2">
            {quizList.map(q => (
              <div key={q.id} className={`flex items-center justify-between border rounded-2xl px-5 py-4 transition ${editingQuiz?.id === q.id ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                <div>
                  <p className="font-bold text-slate-900 flex items-center gap-2">
                    {q.title}
                    {editingQuiz?.id === q.id && <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">en cours d'édition</span>}
                  </p>
                  <p className="text-xs text-slate-400">{q.questionCount} questions{q.creeA ? ` · ${formatDate(q.creeA)}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Edit button */}
                  <button
                    onClick={() => handleEdit(q)}
                    disabled={loadingEditId === q.id || !!deletingId}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold p-2.5 rounded-xl transition disabled:opacity-50"
                    title="Modifier"
                  >
                    {loadingEditId === q.id ? (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    )}
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={() => handleSupprimer(q.id)}
                    disabled={deletingId === q.id || !!loadingEditId}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold p-2.5 rounded-xl transition disabled:opacity-50"
                    title="Supprimer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── ADD / EDIT QUIZ ── */}
      <div id="quiz-form-section" className={`bg-white p-6 rounded-3xl border shadow-md space-y-5 ${isEditing ? 'border-amber-200' : 'border-slate-100'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">
              {isEditing ? '✏️ Modifier le quiz' : 'Ajouter un quiz'}
            </h3>
            {!isEditing && <p className="text-xs text-slate-500">Collez le JSON reçu de NotebookLM / Claude, ou glissez le fichier .json.</p>}
          </div>
          {isEditing && (
            <button
              onClick={handleCancelEdit}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-4 rounded-xl text-sm transition"
            >
              Annuler
            </button>
          )}
        </div>

        {!isEditing && (
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
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {isEditing ? 'JSON du quiz (modifiable)' : 'Ou collez votre JSON'}
          </label>
          <textarea
            value={texte}
            onChange={handleTextChange}
            rows={isEditing ? 12 : 6}
            placeholder='{"titre_quiz": "Mon Quiz", "questions": [...]}'
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-y transition"
          />
        </div>

        {erreur && <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-sm text-rose-700 font-medium">⚠ {erreur}</div>}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm text-emerald-700 font-bold">
            ✓ Quiz {successMsg} dans la bibliothèque !
          </div>
        )}

        {preview && (
          <div className="space-y-4">
            {/* Preview header */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Aperçu</p>
              <p className="font-extrabold text-slate-900">{preview.normalized.meta.title}</p>
              <div className="flex gap-2 text-xs flex-wrap">
                <span className="bg-white border border-emerald-200 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                  {preview.normalized.questions.length} questions
                </span>
              </div>
            </div>

            {/* Add / Remove question buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleAddQuestion}
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-4 py-2.5 rounded-xl text-sm transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter une question
              </button>
              <button
                type="button"
                onClick={handleRemoveQuestion}
                disabled={preview.normalized.questions.length <= 1}
                className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-4 py-2.5 rounded-xl text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                Supprimer dernière
              </button>
            </div>

            {/* Images par question */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Images par question (optionnel)
              </p>

              {preview.normalized.questions.map((q, idx) => {
                const imgState = questionImages[idx]
                // For edit mode, check existing imageUrl in raw data
                const existingUrl = preview.raw.questions[idx]?.imageUrl
                const displayUrl = imgState?.url ?? (imgState === undefined ? existingUrl : null)
                return (
                  <div key={idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start gap-4">
                    {/* Question number */}
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-200 text-slate-600 font-bold text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </span>

                    {/* Question text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 font-medium line-clamp-2 leading-snug">{q.question}</p>

                      {/* Image upload / preview */}
                      <div className="mt-3">
                        {displayUrl ? (
                          <div className="flex items-center gap-3">
                            <img
                              src={displayUrl}
                              alt=""
                              className="h-16 w-24 object-cover rounded-xl border border-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                removeImage(idx)
                                // Also clear from raw preview
                                if (preview.raw.questions[idx]) {
                                  const newRaw = JSON.parse(texte)
                                  newRaw.questions[idx].imageUrl = null
                                  const newText = JSON.stringify(newRaw, null, 2)
                                  setTexte(newText)
                                }
                              }}
                              className="text-xs text-rose-500 hover:text-rose-700 font-semibold transition"
                            >
                              Supprimer
                            </button>
                          </div>
                        ) : imgState?.uploading ? (
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <svg className="animate-spin h-4 w-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Upload en cours…
                          </div>
                        ) : (
                          <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-semibold transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Ajouter une image
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => handleImageUpload(idx, e.target.files[0])}
                            />
                          </label>
                        )}
                        {imgState?.error && (
                          <p className="text-xs text-rose-500 mt-1">{imgState.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <button
          onClick={handleSauvegarder}
          disabled={!preview || loading}
          className={`w-full disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition shadow-md
            ${isEditing ? 'bg-amber-500 hover:bg-amber-400' : 'bg-emerald-600 hover:bg-emerald-500'}`}
        >
          {loading
            ? 'Sauvegarde...'
            : isEditing
              ? '💾 Enregistrer les modifications →'
              : 'Ajouter à la bibliothèque →'}
        </button>
      </div>
    </div>
  )
}

