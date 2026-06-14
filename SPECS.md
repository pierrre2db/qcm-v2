# Spécification Fonctionnelle & Technique — QCM Live V2

> Document de référence pour recoder ou déboguer l'application complète.  
> Version **2.2** · Dernière mise à jour : juin 2026

---

## Changelog

| Version | Date | Modifications |
|---------|------|---------------|
| 2.0 | juin 2026 | Première spécification complète |
| 2.1 | juin 2026 | Mode toggle Solo/Live · Thème Kahoot! · Sync quiz temps réel · Abandon de session · Prompt NotebookLM |
| 2.2 | juin 2026 | Images Cloudinary par question (upload admin + affichage quiz) · Fix meta header auto-load |

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Pile technologique](#2-pile-technologique)
3. [Structure des fichiers](#3-structure-des-fichiers)
4. [Modes de jeu](#4-modes-de-jeu)
5. [Parcours utilisateur détaillés](#5-parcours-utilisateur-détaillés)
6. [Spécification des écrans](#6-spécification-des-écrans)
7. [Architecture Firestore](#7-architecture-firestore)
8. [Format des données quiz](#8-format-des-données-quiz)
9. [Algorithmes clés](#9-algorithmes-clés)
10. [Configuration Firebase](#10-configuration-firebase)
11. [Configuration Cloudinary](#11-configuration-cloudinary)
12. [Déploiement](#12-déploiement)
13. [Sécurité & administration](#13-sécurité--administration)
14. [Règles Firestore](#14-règles-firestore)
15. [Thème visuel Kahoot!](#15-thème-visuel-kahoot)

---

## 1. Vue d'ensemble

Application de quiz interactif multi-joueur synchronisé pour la salle de classe.

**Concept principal :**
- L'enseignant crée une session, projette un QR code, contrôle le rythme
- Les élèves jouent simultanément depuis leur smartphone
- Les questions et contenus sont entièrement séparés du code (données dans Firestore)
- Un mode solo sans Firebase est également disponible
- Les questions peuvent comporter une image hébergée sur Cloudinary

**URL de production :** `https://pierrre2db.github.io/qcm-v2/`

---

## 2. Pile technologique

| Couche | Technologie | Notes |
|--------|-------------|-------|
| Framework UI | React 19 (Vite) | SPA, pas de SSR |
| CSS | Tailwind CSS v4 | Via plugin `@tailwindcss/vite` |
| Base de données | Firebase Firestore v12 | Temps réel via `onSnapshot` |
| Authentification | Firebase Auth anonyme | Auto au chargement |
| Stockage images | Cloudinary CDN | Upload direct browser, preset unsigned |
| QR code | QRious | Rendu sur `<canvas>` |
| Markdown | Composant maison `Md`/`MdBlock` | Zéro dépendance externe |
| CI/CD | GitHub Actions | Déploiement sur GitHub Pages |

**Configuration Vite :**
```js
// vite.config.js — critique pour GitHub Pages
base: '/qcm-v2/'
```

---

## 3. Structure des fichiers

```
qcm-v2/
├── .github/workflows/
│   └── deploy.yml              ← SEUL workflow actif (l'autre a causé page blanche, voir §12)
├── src/
│   ├── data/
│   │   └── afsca.json          ← Quiz intégré par défaut (ancien format)
│   ├── lib/
│   │   ├── firebase.js         ← Config Firebase + signInAnon() + isFirebaseConfigured
│   │   ├── firestore.js        ← Toutes les opérations CRUD + abonnements temps réel
│   │   ├── normalizeQuiz.js    ← Convertit les deux formats JSON → format interne
│   │   └── cloudinary.js       ← Upload image direct browser → Cloudinary CDN (v2.2)
│   ├── hooks/
│   │   ├── useQuizStore.js     ← État du quiz solo (sélection, score, timer)
│   │   └── useLiveQuiz.js      ← État du quiz live (écoute Firestore, soumission)
│   ├── components/
│   │   ├── Header.jsx          ← En-tête adaptatif (clair / sombre selon écran)
│   │   ├── Toast.jsx           ← Notification temporaire + hook useToast()
│   │   ├── Md.jsx              ← Renderer Markdown léger (Md inline, MdBlock)
│   │   ├── ScreenWelcome.jsx   ← Accueil : toggle Solo/Live + leaderboard
│   │   ├── ScreenLobby.jsx     ← Salle d'attente joueur (thème violet foncé)
│   │   ├── ScreenQuiz.jsx      ← Quiz solo (avancement libre) + image Cloudinary
│   │   ├── ScreenQuizLive.jsx  ← Quiz synchronisé (tap-to-answer, 4 couleurs) + image Cloudinary
│   │   ├── ScreenWaiting.jsx   ← Attente question suivante (plein écran vert/rouge)
│   │   ├── ScreenResult.jsx    ← Résultat final + groupe
│   │   ├── ScreenReview.jsx    ← Correction détaillée question par question
│   │   ├── ScreenDashboard.jsx ← Tableau de bord enseignant (3 phases)
│   │   ├── ScreenPodium.jsx    ← Classement final après session live
│   │   └── ScreenAdmin.jsx     ← Gestion bibliothèque quiz + upload images + prompt NotebookLM
│   ├── App.jsx                 ← Orchestrateur central : états, transitions d'écrans
│   └── index.css
├── public/
├── package.json
└── vite.config.js
```

---

## 4. Modes de jeu

### Mode Solo

- Pas de Firebase requis (fonctionne hors ligne)
- Joueur sélectionne l'onglet "Entraînement Solo" → saisit prénom → choisit un quiz → "Commencer"
- Avancement question par question avec bouton "Valider"
- Score sauvegardé dans `localStorage` (top 5, clé `qcm_scores`)
- Correction détaillée disponible après les résultats

### Mode Live (synchronisé)

- Requiert Firebase configuré
- Joueur sélectionne l'onglet "Rejoindre la Classe" → saisit prénom + code session → "Rejoindre"
- Enseignant crée une session → code 6 caractères + QR code
- L'enseignant contrôle le démarrage et l'avancement question par question
- Minuterie 60 secondes synchronisée sur `questionDemarreeA` (timestamp Firestore)
- Avance automatique à 0s si l'enseignant n'a pas cliqué
- Tap-to-answer : un seul appui sur une option = réponse envoyée (pas de confirmation)
- Si le prof quitte en cours de partie → tous les joueurs reçoivent un toast et retournent à l'accueil

---

## 5. Parcours utilisateur détaillés

### 5.1 Joueur — Mode Solo

```
ScreenWelcome
  → onglet "Entraînement Solo" (actif par défaut)
  → saisit prénom
  → choisit quiz dans la liste (chips)
  → clic "Commencer l'entraînement"
ScreenQuiz
  → répond question par question (image Cloudinary affichée si présente)
  → clic "Valider" pour passer à la suivante
  → dernière question → score calculé → leaderboard mis à jour
ScreenResult
  → voit score + groupe + feedback
  → optionnel : "Voir la correction"
    ScreenReview → peut revenir à ScreenResult
  → "Recommencer" → retour ScreenWelcome
```

### 5.2 Joueur — Mode Live

```
ScreenWelcome
  → onglet "Rejoindre la Classe"
  → saisit prénom + code de session (6 chars)
  → clic "Rejoindre la session"
  → lireRoom(code) → récupère quizId → charge le quiz correspondant
  → inscrireJoueur(code, userId, prenom)
ScreenLobby (thème violet foncé)
  → voit le code, les autres joueurs connectés
  → attend que l'enseignant lance
  → écoute salon via useLiveQuiz → quand statut = 'en-cours'
ScreenQuizLive (thème violet foncé, boutons 4 couleurs)
  → voit la question courante (synchronisée avec Firestore)
  → image Cloudinary affichée sous l'énoncé si présente
  → appuie sur une option (rouge/bleu/jaune/vert) → réponse immédiatement soumise
ScreenWaiting (plein écran vert si correct, rouge si faux)
  → voit si sa réponse était correcte
  → attend la question suivante → retour ScreenQuizLive auto
  → quand statut = 'termine' ET abandonne != true :
ScreenResult
  → score calculé côté client
  → même flow que solo (correction disponible)

Si le prof abandonne la session en cours :
  → toast "⚠️ La session a été abandonnée par le professeur."
  → retour automatique ScreenWelcome
```

### 5.3 Enseignant — Session Live

```
ScreenWelcome
  → sélectionne un quiz dans la bibliothèque (chips, onglet Solo visible)
  → clic "Créer une session live" (espace enseignant toujours visible)
  → code 6 chars généré (sans 0/O/1/I)
  → creerSalon(code, nbQuestions, quizId)
ScreenDashboard — phase Lobby
  → QR code 280px + code session 5xl + URL complète
  → liste des joueurs connectés en temps réel
  → bouton "Lancer la partie"
ScreenDashboard — phase En cours
  → QR code 160px + code + URL (pour retardataires)
  → stats : répondu / score moyen / terminés
  → timer 60s visuel
  → bouton "Question suivante" (toujours actif)
  → auto-avance à 0s
ScreenDashboard — phase Terminé
  → stats finales
  → bouton "Voir le podium"
ScreenPodium
  → top 3 + rang 4+ en dessous
  → "Fermer le salon" → terminerSalon() → ScreenWelcome

Si l'enseignant ferme l'onglet ou clique "Fermer" en cours de partie :
  → abandonnerSalon() → abandonne: true dans Firestore
  → tous les joueurs connectés reçoivent le toast et retournent à l'accueil
```

### 5.4 Administrateur

```
ScreenWelcome
  → clic bouton "Administration" (icône engrenage, espace enseignant)
  → modal mot de passe (code : 1234)
  → mot de passe correct →
ScreenAdmin
  → Section 1 : Générateur de prompt NotebookLM
    · Saisit sujet + nombre de questions
    · Prompt mis à jour en temps réel (ancré sur documents sources)
    · Clic "Copier le prompt" → presse-papiers
    · Bouton "?" → panneau d'info format JSON
  → Section 2 : Quiz disponibles (liste temps réel via onSnapshot)
    · Liste avec titre, nb questions, date
    · Bouton supprimer par quiz
  → Section 3 : Ajouter un quiz
    · Glisser/déposer .json OU coller JSON dans textarea
    · Parsing + normalisation en temps réel
    · Aperçu : titre + nb questions + Q1 preview
    · Pour chaque question : upload image optionnel → Cloudinary CDN
    · Clic "Ajouter à la bibliothèque" → merge imageUrls → ajouterQuiz() → Firestore
  → bouton "Retour" → ScreenWelcome
```

---

## 6. Spécification des écrans

### ScreenWelcome

**Props :** `{ meta, onJoin, onCreateSession, leaderboard, onAdmin, quizList, selectedQuizId, onSelectQuiz }`

**Sections :**
1. Badge + titre + description
2. **Toggle mode** : deux onglets "Entraînement Solo" / "Rejoindre la Classe" — Solo actif par défaut
3. **Formulaire adaptatif** :
   - Mode Solo : champ prénom + sélecteur quiz (chips, `quizList.length > 0`) + bouton "Commencer l'entraînement"
   - Mode Live : champ prénom + champ code 6 chars (centré, grand) + bouton "Rejoindre la session"
4. **Espace enseignant** (dark card, toujours visible) : QR code canvas + "Créer une session live" + "Administration"
5. **Leaderboard solo** : tableau top 5 depuis `localStorage`

**Comportements :**
- Si URL contient `?room=CODE` → mode Live présélectionné + code pré-rempli
- Touche Entrée = submit
- `onJoin(name, code)` : en mode Solo, `code = ''`
- Titre du quiz sélectionné affiché dans le Header dès le chargement (fix v2.2)

**QR code :** généré avec `QRious` sur `window.location.href` (sans query string), taille 140px, couleur `#059669`.

---

### ScreenLobby *(thème violet foncé)*

**Props :** `{ prenom, codeS, joueurs }`

- Fond violet foncé (`#46178F`) hérité de App
- Spinner animé centré
- Code session affiché en 5xl bold
- Joueurs connectés : chips colorées (8 couleurs cycliques) avec initiale + prénom
- Message "En attente du lancement…"

---

### ScreenQuizLive *(thème violet foncé, 4 couleurs Kahoot!)*

**Props :** `{ question, indice, total, questionDemarreeA, onRepondre }`

- Fond violet foncé hérité de App
- Barre progression globale (blanc/20) + barre timer (vert→amber→rouge selon temps)
- Carte question blanche centrée avec `<Md>` pour le texte
- **Image Cloudinary** (v2.2) : si `question.imageUrl`, affiche `<img>` sous l'énoncé (`max-h-52`, `rounded-xl`, `object-contain`)
- **4 boutons réponse en grille 1col (mobile) / 2col (≥sm)** :
  - A : rouge `#E21B3C` + icône ▲
  - B : bleu `#1368CE` + icône ◆
  - C : jaune `#D89E00` + icône ●
  - D : vert `#26890C` + icône ■
- **Tap-to-answer** : clic → `confirme = true` → `onRepondre(idx)` immédiatement
- Après réponse : options non sélectionnées → `opacity-40 scale-97`, sélectionnée → ring blanc + `scale-102`
- Message bas : "✓ Réponse enregistrée — en attente de la prochaine question"
- Timer 60s synchronisé sur `questionDemarreeA`

---

### ScreenQuiz *(mode solo)*

**Props :** `{ currentQuestion, currentIndex, totalQuestions, selectedOption, startTime, onSelect, onConfirm }`

- Barre de progression + timer elapsed
- Carte question blanche avec `<Md>` pour l'énoncé
- **Image Cloudinary** (v2.2) : si `currentQuestion.imageUrl`, affiche `<img>` sous l'énoncé (`max-h-64`, `rounded-2xl`, `object-contain`, `border`, `shadow-md`)
- Grille d'options A/B/C/D avec sélection radio
- Bouton "Valider" désactivé tant qu'aucune option sélectionnée

---

### ScreenWaiting *(plein écran dramatique)*

**Props :** `{ estCorrect, indice, total }`

- Fond violet foncé hérité de App
- Icône circulaire géante (128px) : vert `#26890C` si correct, rouge `#E21B3C` si faux
- Texte 4xl bold blanc : "Bonne réponse !" / "Pas tout à fait…"
- Points animés bounce en attente
- Barre progression blanche (opaque sur fond violet)

---

### ScreenDashboard

**Props :** `{ roomCode, players, totalQuestions, salon, onLancer, onQuestionSuivante, onTerminer, onClose }`

Trois branches selon `salon.statut` :

#### Phase Lobby (`statut === 'attente'`)
- QR code 280px centré, couleur emerald
- Code session en 5xl/6xl, URL complète en dessous
- Chips des joueurs connectés (liste `players`)
- Bouton "Lancer la partie" → `onLancer()`

#### Phase En cours (`statut === 'en-cours'`)
- **Colonne gauche** : QR code 160px + code + URL (joueurs retardataires)
- **Colonne droite** :
  - N° question courante (`salon.questionCourante + 1` / `totalQuestions`)
  - Grille stats : joueurs ayant répondu / score moyen / joueurs terminés
  - Barre timer 60s (calcul depuis `salon.questionDemarreeA`)
  - Bouton "Question suivante" → `onQuestionSuivante(idx + 1)` — **toujours actif**
  - Bouton "Terminer" → `onTerminer()` à la dernière question

#### Phase Terminée (`statut === 'termine'`)
- Récap stats
- Bouton "Voir le Podium"
- Bouton "Fermer le salon"

---

### ScreenAdmin

**Props :** `{ quizList, onQuizAdded, onQuizDeleted, onBack }`

**Section "Générer avec NotebookLM" (dark card) :**
- Input "Sujet du quiz" + input "Nb questions" (3–50, défaut 10)
- `buildPrompt(sujet, nombre)` génère un prompt ancré sur les documents sources du notebook
- `pre` scrollable affichant le prompt
- Bouton "Copier le prompt" (feedback visuel 2s "Copié !")
- Bouton "?" → panneau d'info avec `JSON_FORMAT_EXEMPLE` + légende champs

**Workflow NotebookLM :**
1. Uploader les documents de cours dans NotebookLM
2. Copier le prompt depuis l'admin
3. Coller dans le chat NotebookLM → reçoit le JSON
4. Coller le JSON dans la section "Ajouter un quiz"

**Section "Quiz disponibles" :**
- Liste temps réel via `abonnerQuizzes()` (onSnapshot) — toutes les devices voient les ajouts/suppressions instantanément
- Titre, nb questions, date + bouton supprimer → `supprimerQuiz(id)`

**Section "Ajouter un quiz" :**
- Zone drag-and-drop + `<input type="file" accept=".json">`
- Textarea collage JSON
- `parseAndPreview(text)` → `normalizeQuiz()` → aperçu ou erreur
- **Upload image par question (v2.2)** :
  - Pour chaque question de l'aperçu : `<input type="file" accept="image/*">`
  - `handleImageUpload(questionIndex, file)` → `uploadToCloudinary(file)` → state `questionImages[idx].url`
  - États : `{ uploading: true }` pendant upload, `{ url }` après succès, `{ error }` en cas d'échec
  - Aperçu miniature de l'image uploadée + bouton supprimer
- Bouton "Ajouter à la bibliothèque" activé seulement si `preview !== null`
- Avant save : merge `questionImages` → `rawWithImages.questions[idx].imageUrl = url ?? null`
- → `ajouterQuiz(rawWithImages, title, questionCount)` → `onQuizAdded({ id, title, questionCount })`

---

### ScreenPodium

**Props :** `{ players, onBack, onClose }`

- Tri : `player.score` décroissant, à égalité `player.tempsPasse || player.timeSpent || '99:99'` croissant
- Affichage nom : `player.prenom || player.username || '?'`
- Score : `player.score ?? 0` + temps `player.tempsPasse || player.timeSpent`
- Top 3 visuellement distincts (médailles), rang 4+ dans tableau en dessous
- Bouton "Retour" → `onBack()` (tableau de bord)
- Bouton "Fermer le salon" → `onClose()`

---

### ScreenReview

**Props :** `{ questions, answers, onBack }`

- `answers` : tableau `{ questionId, chosenIndex, isCorrect }`
- Pour chaque question :
  - Question : `<Md>` (inline Markdown)
  - Réponse du joueur + réponse correcte (si erreur) : `<Md>`
  - Explication (`q.explanation`) : `<MdBlock>` (blocs + listes à puces)
  - Catégorie (`q.category`) : affichée si non vide

---

### ScreenResult

**Props :** `{ username, score, totalQuestions, timeSpent, groups, onRestart, onReview }`

- Score / totalQuestions + temps
- Groupe calculé par `groups.find(g => score <= g.maxScore)` → titre + feedback
- Bouton "Voir la correction détaillée" → `onReview()`
- Bouton "Recommencer" → `onRestart()`

---

### Header

**Props :** `{ meta, username, isLive, onLeaveRoom, isDark }`

- `isDark` = `true` pour les écrans LOBBY, QUIZ_LIVE, WAITING
- Mode sombre : fond `#3b1278`, textes blancs, boutons `bg-white/15`
- Mode clair : fond blanc, textes slate, boutons `bg-slate-100`
- Badge "Live" (rose, animate-pulse) si `isLive`
- Bouton "Quitter le Salon" si `isLive`
- **Fix v2.2** : `meta.title` se met à jour avec le quiz sélectionné dès le chargement

---

## 7. Architecture Firestore

```
rooms/{roomId}                          ← session de jeu
  statut: 'attente' | 'en-cours' | 'termine'
  questionCourante: number              ← index 0..N-1, -1 en lobby
  questionDemarreeA: Timestamp | null   ← base de la minuterie 60s
  totalQuestions: number
  quizId: string | null                 ← ID du quiz Firestore sélectionné
  abandonne: boolean (optionnel)        ← true si session quittée prématurément
  creeA: Timestamp

rooms/{roomId}/players/{userId}         ← un document par joueur
  idUtilisateur: string
  prenom: string
  reponses: { [questionIndex]: chosenIndex }   ← map dynamique
  score: number
  statut: 'attente' | 'en-cours' | 'termine'
  groupe: string                        ← 'Insuffisant' | 'Améliorable' | 'Expert'
  tempsPasse: string                    ← format 'MM:SS'
  derniereMiseAJour: Timestamp

quizzes/{quizId}                        ← bibliothèque de quiz
  title: string
  questionCount: number
  rawData: object                       ← JSON brut original + imageUrl par question si uploadée
  creeA: Timestamp
```

**Note v2.2 :** `rawData.questions[n].imageUrl` contient l'URL Cloudinary CDN ou `null`.

**Opérations Firestore (firestore.js) :**

| Fonction | Type | Description |
|----------|------|-------------|
| `creerSalon(codeS, total, quizId)` | setDoc | Crée room en statut 'attente' |
| `lancerPartie(codeS)` | updateDoc | statut → 'en-cours', questionCourante → 0 |
| `passerQuestionSuivante(codeS, idx, total)` | updateDoc | Avance ou termine |
| `terminerSalon(codeS)` | updateDoc | statut → 'termine' (fin normale) |
| `abandonnerSalon(codeS)` | updateDoc (silent) | statut → 'termine' + abandonne → true |
| `lireRoom(codeS)` | getDoc | Lecture unique (player join) |
| `abonnerSalon(codeS, cb)` | onSnapshot | Écoute temps réel du salon |
| `inscrireJoueur(codeS, uid, prenom)` | setDoc | Crée doc joueur |
| `soumettreReponse(...)` | getDoc + updateDoc | Merge réponse + recalcule score |
| `abonnerJoueurs(codeS, cb)` | onSnapshot (collection) | Liste joueurs temps réel |
| `abonnerQuizzes(cb)` | onSnapshot + query | Liste quiz temps réel, tri creeA desc |
| `ajouterQuiz(raw, title, count)` | addDoc | Stocke JSON brut complet (avec imageUrl) |
| `chargerQuizParId(id)` | getDoc | Retourne `{ id, rawData, ... }` |
| `supprimerQuiz(id)` | deleteDoc | Supprime quiz bibliothèque |

---

## 8. Format des données quiz

### Format interne (utilisé par tous les composants)

```json
{
  "meta": {
    "title": "Titre affiché",
    "subtitle": "Sous-titre",
    "badge": "Texte du badge accueil",
    "theme": "emerald",
    "footer": "Texte pied de page",
    "footerLinks": [{ "label": "...", "href": "..." }]
  },
  "groups": [
    { "maxScore": 4,   "label": "Insuffisant", "color": "red",   "title": "...", "feedback": "..." },
    { "maxScore": 8,   "label": "Améliorable", "color": "amber", "title": "...", "feedback": "..." },
    { "maxScore": 999, "label": "Expert",       "color": "green", "title": "...", "feedback": "..." }
  ],
  "questions": [
    {
      "id": 1,
      "category": "Difficulté 3/5",
      "question": "Texte avec **gras** et *italique* ?",
      "options": ["Réponse A", "Réponse B", "Réponse C", "Réponse D"],
      "correctIndex": 0,
      "explanation": "Explication didactique.\n- Point 1\n- Point 2",
      "imageUrl": "https://res.cloudinary.com/dfaiu57aj/image/upload/v.../qcm-v2/xxx.jpg"
    }
  ]
}
```

**Champ `imageUrl` (v2.2) :** URL Cloudinary CDN ou `null` si pas d'image.

### Nouveau format NotebookLM/Claude (généré par le prompt builder)

```json
{
  "titre_quiz": "Hygiène alimentaire",
  "sous_titre": "Optionnel",
  "questions": [
    {
      "id": 1,
      "difficulte": 3,
      "question": "Question ?",
      "options": {
        "A": "Réponse A",
        "B": "Réponse B",
        "C": "Réponse C",
        "D": "Réponse D"
      },
      "bonne_reponse": "A",
      "pourquoi": "Explication.\n- Point clé 1",
      "imageUrl": null
    }
  ]
}
```

**Champs clés :**
- `bonne_reponse` : lettre `"A"`, `"B"`, `"C"` ou `"D"` (détection du format)
- `options` : objet `{A, B, C, D}` (pas un tableau)
- `difficulte` : entier 1–5 → affiché en `category` comme `"Difficulté X/5"`
- `pourquoi` → `explanation` ; `\n` dans les strings JSON = retour à la ligne
- `imageUrl` : ajouté par l'admin avant save Firestore (v2.2), `null` si pas d'image
- Markdown (`**gras**`, `*italique*`, `- liste`) supporté dans tous les champs texte

---

## 9. Algorithmes clés

### 9.1 Normalisation des formats (`normalizeQuiz.js`)

```
1. Détection : questions[0].bonne_reponse !== undefined → nouveau format
2. Si ancien format → retour direct (pass-through)
3. Si nouveau format :
   a. meta = data.meta ?? { titre_quiz, DEFAULT_META }
   b. groups = data.groups ?? defaultGroups(total) avec seuils 40% / 75%
   c. Pour chaque question :
      - options = [A, B, C, D].map(l => q.options[l]).filter(Boolean)
      - correctIndex = ['A','B','C','D'].indexOf(bonne_reponse.toUpperCase())
      - category = difficulte ? `Difficulté ${difficulte}/5` : ''
      - explanation = pourquoi ?? ''
      - imageUrl = q.imageUrl ?? null   ← v2.2
```

**Stockage Firestore :** JSON brut original stocké (`rawData`). Normalisation côté client au chargement.

### 9.2 Synchronisation minuterie 60s

```
1. Enseignant avance → passerQuestionSuivante() → updateDoc({ questionDemarreeA: serverTimestamp() })
2. Joueurs et enseignant écoutent salon via onSnapshot
3. questionDemarreeA reçu → elapsed = (Date.now() - questionDemarreeA.toMillis()) / 1000
4. remaining = Math.max(0, 60 - elapsed)
5. setInterval 500ms pour mise à jour UI
6. Si remaining ≤ 0 → auto-avance (enseignant uniquement via Dashboard)
```

### 9.3 Tap-to-answer (ScreenQuizLive)

```
1. Joueur appuie sur option
2. confirme = true (désactive les autres options visuellement)
3. onRepondre(idx) appelé immédiatement → soumettreReponse() vers Firestore
4. App → setDernierReponse({ estCorrect, indice }) → setScreen(S.WAITING)
5. live.salon change → question suivante → setScreen(S.QUIZ_LIVE)
```

### 9.4 Calcul de score (soumettreReponse)

```
- Score calculé côté client avant envoi Firestore
- À chaque soumission : comparer reponses[idx] avec questions[idx].correctIndex
- Score = nb de bonnes réponses
- tempsPasse = 'MM:SS' calculé depuis quiz.startTime
- Groupe = getGroupe(score) → 'Insuffisant' / 'Améliorable' / 'Expert'
  (seuils : ≤4 = Insuffisant, ≤8 = Améliorable, sinon Expert)
```

### 9.5 Multi-quiz : chargement pour joueur live

```
1. Joueur entre code de session → handleJoin(name, code)
2. lireRoom(code) → { quizId, ... }
3. Si quizId → chargerQuizParId(quizId) → { rawData }
4. setQuizData(normalizeQuiz(rawData)) + quiz.reset()
5. Joueur a maintenant les mêmes questions que l'enseignant
6. inscrireJoueur() + setRoomId() [batch React 18] + setScreen(LOBBY)
```

### 9.6 Transition écrans live (correction bug timing)

```
Problème : setRoomId() et setScreen(LOBBY) séparés par await inscrireJoueur().
Si salon déjà 'en-cours', live.salon fire avant que screen = LOBBY.
Condition ancienne : screen === LOBBY → transition manquée.

Fix : condition élargie
  statut 'en-cours' + screen ∈ {LOBBY, WAITING, WELCOME}
    → si aDejaRepondu : WAITING
    → sinon : QUIZ_LIVE
```

### 9.7 Abandon de session

```
Déclencheurs :
  a. Prof ferme l'onglet/navigateur (beforeunload) pendant la partie
  b. Prof clique "Fermer le salon" quand statut !== 'termine'

Action : abandonnerSalon(roomId) → updateDoc({ statut: 'termine', abandonne: true })
  (silent try/catch — peut échouer pendant unload)

Réception côté joueur (live.salon effect) :
  statut = 'termine' ET abandonne = true
    → showToast("⚠️ La session a été abandonnée par le professeur.")
    → setRoomId(null), quiz.reset(), retour WELCOME

Fin normale (sans abandonne) → flow normal ScreenResult
```

### 9.8 Sync temps réel bibliothèque quiz

```
Remplace listerQuizzes() (one-shot) par abonnerQuizzes() (onSnapshot).
Tous les appareils voient instantanément les ajouts/suppressions depuis l'Admin.
selectedQuizId : conservé si déjà défini (prev ?? list[0].id).
```

### 9.9 Leaderboard solo (localStorage)

```
- Clé : 'qcm_scores'
- Structure : [{ name, score, time, group, date }]
- Tri : score décroissant, puis time croissant
- Limité à top 5
- Groupe calculé par getGroupLabel(score, groups)
```

### 9.10 Génération code session

```javascript
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
// Exclut : I, O, 0, 1 → évite confusion visuelle
let code = ''
for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
```

### 9.11 Renderer Markdown (`Md.jsx`)

```
Md (inline) :
  - Split texte sur /(\*\*[\s\S]+?\*\*|\*[\s\S]+?\*)/g
  - **texte** → <strong>, *texte* → <em>, reste → texte brut
  - \n → <br />

MdBlock (bloc) :
  - Split par lignes
  - Ligne commençant par "- " ou "• " → item de liste <ul>
  - Ligne vide → fin de liste en cours
  - Autre → <p>
  - Chaque élément passe par renderInline()
```

### 9.12 Upload image Cloudinary (`cloudinary.js`) — v2.2

```javascript
// src/lib/cloudinary.js
const CLOUD_NAME = 'dfaiu57aj'
const UPLOAD_PRESET = 'qcm_upload'  // mode Unsigned

export async function uploadToCloudinary(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', 'qcm-v2')
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || 'Upload Cloudinary échoué')
  }
  const data = await res.json()
  return data.secure_url  // URL CDN permanente
}
```

**Flux :** fichier sélectionné → `FormData` → POST Cloudinary → `secure_url` → stocké dans `questionImages[idx].url` → mergé dans `rawData` avant save Firestore.

### 9.13 Auto-load meta header — fix App.jsx (v2.2)

```
Problème : abonnerQuizzes() initialisait selectedQuizId mais ne chargeait pas le quiz.
→ Header affichait le titre AFSCA par défaut au lieu du quiz sélectionné.

Fix dans le callback abonnerQuizzes :
  setSelectedQuizId(prev => {
    const id = prev ?? (list.length > 0 ? list[0].id : null)
    if (!prev && id) {
      chargerQuizParId(id).then(doc => {
        if (doc?.rawData) setQuizData(normalizeQuiz(doc.rawData))
      })
    }
    return id
  })
→ Premier chargement → chargerQuizParId() auto → meta mis à jour → Header correct.
```

---

## 10. Configuration Firebase

**Projet Firebase :** `qcm-live-class`

Fichier `src/lib/firebase.js` — configuration hardcodée :

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "qcm-live-class.firebaseapp.com",
  projectId: "qcm-live-class",
  storageBucket: "qcm-live-class.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
}
```

**`isFirebaseConfigured`** : booléen exporté, `true` si `firebaseConfig.apiKey` est défini.

**Auth anonyme :** `signInAnon()` appelé au montage de `App`. Retourne `{ uid }` utilisé comme identifiant joueur.

---

## 11. Configuration Cloudinary — v2.2

**Console :** https://console.cloudinary.com/

| Paramètre | Valeur |
|-----------|--------|
| Cloud name | `dfaiu57aj` |
| Upload preset | `qcm_upload` |
| Mode preset | Unsigned (upload direct depuis browser) |
| Folder | `qcm-v2` |
| Formats acceptés | image/* (jpg, png, webp, gif, svg…) |

**URL API upload :** `https://api.cloudinary.com/v1_1/dfaiu57aj/image/upload`

**Sécurité :** preset unsigned = accès public en écriture limité à ce preset. Adapté pour usage scolaire interne. En production exposée, passer en mode signed avec backend.

---

## 12. Déploiement

### Workflow GitHub Actions (`deploy.yml`)

1. Déclenché sur push vers `main`
2. `npm ci`
3. `npm run build` → génère `dist/`
4. Upload `dist/` → GitHub Pages

**Attention :** GitHub peut créer automatiquement un second workflow `static.yml` qui déploie les sources brutes (sans build). **Ne jamais laisser deux workflows actifs.** Si `static.yml` existe, le supprimer immédiatement.

### Commandes développement

| Action | Commande |
|--------|----------|
| Développement local | `npm run dev` (port 5174) |
| Build production | `npm run build` |
| Déploiement | `git push origin main` |

---

## 13. Sécurité & administration

### Mot de passe admin

- Constante dans `App.jsx` : `const ADMIN_PASSWORD = '1234'`
- Validation côté client uniquement (pas de vérification serveur)
- Modal prompt affiché sur `handleAdminAccess()` → si correct → `setScreen(S.ADMIN)`

### Authentification Firebase

- Authentification anonyme uniquement
- Pas de compte utilisateur, pas d'email
- `userId` = UID Firebase généré automatiquement, persisté en session

### Sécurité quiz

- Quiz stockés dans Firestore avec accès public en lecture/écriture (règles ouvertes)
- Seul l'accès à l'écran Admin (via mot de passe) permet d'ajouter/supprimer

---

## 14. Règles Firestore

Règles à appliquer dans la Firebase Console :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId} {
      allow read, write: if true;
      match /players/{userId} {
        allow read, write: if true;
      }
    }
    match /config/{docId} {
      allow read, write: if true;
    }
    match /quizzes/{quizId} {
      allow read, write: if true;
    }
  }
}
```

> Règles intentionnellement ouvertes (application scolaire interne). En environnement exposé, ajouter validation d'authentification.

---

## 15. Thème visuel Kahoot!

Les écrans de jeu actifs (LOBBY, QUIZ_LIVE, WAITING) utilisent un thème sombre inspiré de Kahoot!.

### Palette de couleurs

| Élément | Couleur | Code hex |
|---------|---------|----------|
| Fond principal jeu | Violet foncé | `#46178F` |
| Fond header sombre | Violet moyen | `#3b1278` |
| Réponse A | Rouge | `#E21B3C` |
| Réponse B | Bleu | `#1368CE` |
| Réponse C | Jaune/or | `#D89E00` |
| Réponse D | Vert | `#26890C` |
| Correct (ScreenWaiting) | Vert | `#26890C` |
| Incorrect (ScreenWaiting) | Rouge | `#E21B3C` |

### Icônes des réponses

| Option | Icône | Couleur |
|--------|-------|---------|
| A | ▲ triangle | Rouge |
| B | ◆ losange | Bleu |
| C | ● cercle | Jaune |
| D | ■ carré | Vert |

### Détection écran sombre (App.jsx)

```js
const isDark = [S.LOBBY, S.QUIZ_LIVE, S.WAITING].includes(screen)
// → prop isDark passée au Header
// → fond App : bg-[#46178F] si isDark, bg-slate-50 sinon
```

### Avatars joueurs (ScreenLobby)

8 couleurs cycliques : rouge, bleu, jaune, vert, violet, rose, cyan, orange.
Initiale du prénom affichée dans un cercle coloré.

---

## Annexe — Constantes importantes

| Constante | Valeur | Localisation |
|-----------|--------|--------------|
| `ADMIN_PASSWORD` | `'1234'` | `App.jsx` |
| `LS_KEY` | `'qcm_scores'` | `App.jsx` |
| Durée question live | 60 secondes | `ScreenDashboard.jsx`, `ScreenQuizLive.jsx` |
| Taille QR lobby | 280px | `ScreenDashboard.jsx` |
| Taille QR en cours | 160px | `ScreenDashboard.jsx` |
| Taille QR accueil | 140px | `ScreenWelcome.jsx` |
| Couleur QR | `#059669` (emerald-600) | partout |
| Chars code session | `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` | `App.jsx` |
| Top leaderboard | 5 entrées | `App.jsx` |
| Seuil groupe défaut | 40% / 75% | `normalizeQuiz.js` |
| Fond jeu sombre | `#46178F` | `App.jsx` (isDark) |
| Fond header sombre | `#3b1278` | `Header.jsx` |
| Cloudinary cloud | `dfaiu57aj` | `cloudinary.js` |
| Cloudinary preset | `qcm_upload` (unsigned) | `cloudinary.js` |
| Cloudinary folder | `qcm-v2` | `cloudinary.js` |
