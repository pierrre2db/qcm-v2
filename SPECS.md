# Spécification Fonctionnelle & Technique — QCM Live V2

> Document de référence pour recoder ou déboguer l'application complète.  
> État : **production** · Dernière mise à jour : juin 2026

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
11. [Déploiement](#11-déploiement)
12. [Sécurité & administration](#12-sécurité--administration)
13. [Règles Firestore](#13-règles-firestore)

---

## 1. Vue d'ensemble

Application de quiz interactif multi-joueur synchronisé pour la salle de classe.

**Concept principal :**
- L'enseignant crée une session, projette un QR code, contrôle le rythme
- Les élèves jouent simultanément depuis leur smartphone
- Les questions et contenus sont entièrement séparés du code (données dans Firestore)
- Un mode solo sans Firebase est également disponible

**URL de production :** `https://pierrre2db.github.io/qcm-v2/`

---

## 2. Pile technologique

| Couche | Technologie | Notes |
|--------|-------------|-------|
| Framework UI | React 19 (Vite) | SPA, pas de SSR |
| CSS | Tailwind CSS v4 | Via plugin `@tailwindcss/vite` |
| Base de données | Firebase Firestore v12 | Temps réel via `onSnapshot` |
| Authentification | Firebase Auth anonyme | Auto au chargement |
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
│   └── deploy.yml              ← SEUL workflow actif (l'autre a causé page blanche, voir §11)
├── src/
│   ├── data/
│   │   └── afsca.json          ← Quiz intégré par défaut (ancien format)
│   ├── lib/
│   │   ├── firebase.js         ← Config Firebase + signInAnon() + isFirebaseConfigured
│   │   ├── firestore.js        ← Toutes les opérations CRUD + abonnements temps réel
│   │   └── normalizeQuiz.js    ← Convertit les deux formats JSON → format interne
│   ├── hooks/
│   │   ├── useQuizStore.js     ← État du quiz solo (sélection, score, timer)
│   │   └── useLiveQuiz.js      ← État du quiz live (écoute Firestore, soumission)
│   ├── components/
│   │   ├── Header.jsx          ← En-tête avec bouton "Quitter" si live
│   │   ├── Toast.jsx           ← Notification temporaire + hook useToast()
│   │   ├── Md.jsx              ← Renderer Markdown léger (Md inline, MdBlock)
│   │   ├── ScreenWelcome.jsx   ← Accueil : connexion + sélecteur quiz + leaderboard
│   │   ├── ScreenLobby.jsx     ← Salle d'attente joueur
│   │   ├── ScreenQuiz.jsx      ← Quiz solo (avancement libre)
│   │   ├── ScreenQuizLive.jsx  ← Quiz synchronisé (tap-to-answer)
│   │   ├── ScreenWaiting.jsx   ← Attente question suivante (live)
│   │   ├── ScreenResult.jsx    ← Résultat final + groupe
│   │   ├── ScreenReview.jsx    ← Correction détaillée question par question
│   │   ├── ScreenDashboard.jsx ← Tableau de bord enseignant (3 phases)
│   │   ├── ScreenPodium.jsx    ← Classement final après session live
│   │   └── ScreenAdmin.jsx     ← Gestion bibliothèque quiz + générateur de prompt
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
- Joueur entre son prénom, laisse le code vide → `ScreenQuiz`
- Avancement question par question avec bouton "Valider"
- Score sauvegardé dans `localStorage` (top 5, clé `qcm_scores`)
- Correction détaillée disponible après les résultats

### Mode Live (synchronisé)

- Requiert Firebase configuré
- Enseignant crée une session → code 6 caractères + QR code
- Joueurs rejoignent via QR code (pré-remplit le code) ou saisie manuelle
- L'enseignant contrôle le démarrage et l'avancement question par question
- Minuterie 60 secondes synchronisée sur `questionDemarreeA` (timestamp Firestore)
- Avance automatique à 0s si l'enseignant n'a pas cliqué
- Tap-to-answer : un seul appui sur une option = réponse envoyée (pas de confirmation)

---

## 5. Parcours utilisateur détaillés

### 5.1 Joueur — Mode Solo

```
ScreenWelcome
  → saisit prénom, laisse code vide
  → clic "Se connecter & Commencer"
ScreenQuiz
  → répond question par question
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
  → saisit prénom + code de session (6 chars)
  → clic "Se connecter & Commencer"
  → lireRoom(code) → récupère quizId → charge le quiz correspondant
  → inscrireJoueur(code, userId, prenom)
ScreenLobby
  → attend que l'enseignant lance
  → écoute salon via useLiveQuiz → quand statut = 'en-cours'
ScreenQuizLive
  → voit la question courante (synchronisée avec Firestore)
  → appuie sur une option → réponse immédiatement soumise
ScreenWaiting
  → voit si sa réponse était correcte
  → attend la question suivante → retour ScreenQuizLive auto
  → quand statut = 'termine' :
ScreenResult
  → score calculé côté client
  → même flow que solo (correction disponible)
```

### 5.3 Enseignant — Session Live

```
ScreenWelcome
  → sélectionne un quiz dans la bibliothèque (chips)
  → clic "Créer une session live"
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
```

### 5.4 Administrateur

```
ScreenWelcome
  → clic bouton "Administration" (icône engrenage)
  → modal mot de passe (code : 1234)
  → mot de passe correct →
ScreenAdmin
  → Section 1 : Générateur de prompt Claude
    · Saisit sujet + nombre de questions
    · Prompt mis à jour en temps réel
    · Clic "Copier le prompt" → presse-papiers
    · Bouton "?" → panneau d'info format JSON
  → Section 2 : Quiz disponibles
    · Liste avec titre, nb questions, date
    · Bouton supprimer par quiz
  → Section 3 : Ajouter un quiz
    · Glisser/déposer .json OU coller JSON dans textarea
    · Parsing + normalisation en temps réel
    · Aperçu : titre + nb questions + Q1 preview
    · Clic "Ajouter à la bibliothèque" → ajouterQuiz() → Firestore
  → bouton "Retour" → ScreenWelcome
```

---

## 6. Spécification des écrans

### ScreenWelcome

**Props :** `{ meta, onJoin, onCreateSession, leaderboard, onAdmin, quizList, selectedQuizId, onSelectQuiz }`

**Sections :**
1. Badge + titre "Concours d'Hygiène de Classe" + description
2. **Sélecteur de quiz** (affiché si `quizList.length > 0`) : chips horizontales, sélectionné = fond emerald. Met à jour l'état `selectedQuizId` dans App.
3. **Formulaire joueur** : champ prénom + champ code (facultatif). Touche Entrée = submit. Validation : prénom non vide.
4. **Espace enseignant** (dark card) : QR code canvas + bouton "Créer une session live" + bouton "Administration"
5. **Leaderboard solo** : tableau top 5 depuis `localStorage`

**QR code :** généré avec `QRious` sur `window.location.href` (sans query string), taille 140px, couleur `#059669`.

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
  - Grille stats : joueurs ayant répondu (`reponses[qIdx] != null`) / score moyen / joueurs terminés
  - Barre timer 60s (calcul depuis `salon.questionDemarreeA`)
  - Bouton "Question suivante" → `onQuestionSuivante(idx + 1)` — **toujours actif**
  - Bouton "Terminer" → `onTerminer()` à la dernière question

#### Phase Terminée (`statut === 'termine'`)
- Récap stats
- Bouton "Voir le Podium"
- Bouton "Fermer le salon"

**QR code :** régénéré quand `estLobby` change (taille différente selon phase).

---

### ScreenQuizLive

**Props :** `{ question, indice, total, questionDemarreeA, onRepondre }`

- Affiche la question avec `<Md>` (support **gras**, *italique*)
- 4 options rendues avec `<Md>`
- **Tap-to-answer** : clic → `confirme = true` → `onRepondre(idx)` immédiatement
- Après réponse : options non sélectionnées → `opacity-50 cursor-default`
- Option sélectionnée : mise en avant (border emerald)
- Footer message : "✓ Réponse enregistrée — en attente de la prochaine question"
- Timer 60s synchronisé sur `questionDemarreeA`

---

### ScreenAdmin

**Props :** `{ quizList, onQuizAdded, onQuizDeleted, onBack }`

**Section "Générer avec Claude" (dark card) :**
- Input "Sujet du quiz" + input "Nb questions" (3–50, défaut 10)
- `buildPrompt(sujet, nombre)` génère le prompt en direct
- `pre` scrollable affichant le prompt
- Bouton "Copier le prompt" (feedback visuel 2s "Copié !")
- Bouton "?" → panneau d'info avec `JSON_FORMAT_EXEMPLE` + légende champs

**Section "Quiz disponibles" :**
- Liste des quiz Firestore avec titre, nb questions, date (`formatDate(ts)`)
- Bouton supprimer (rouge) par ligne → `supprimerQuiz(id)` + `onQuizDeleted(id)`

**Section "Ajouter un quiz" :**
- Zone drag-and-drop + `<input type="file" accept=".json">`
- Textarea collage JSON
- Les deux déclenchent `parseAndPreview(text)` → `normalizeQuiz()` → aperçu ou erreur
- Bouton "Ajouter à la bibliothèque" activé seulement si `preview !== null`
- → `ajouterQuiz(raw, title, questionCount)` → `onQuizAdded({ id, title, questionCount })`

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

## 7. Architecture Firestore

```
rooms/{roomId}                          ← session de jeu
  statut: 'attente' | 'en-cours' | 'termine'
  questionCourante: number              ← index 0..N-1, -1 en lobby
  questionDemarreeA: Timestamp | null   ← base de la minuterie 60s
  totalQuestions: number
  quizId: string | null                 ← ID du quiz Firestore sélectionné
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
  rawData: object                       ← JSON brut original (tel que reçu)
  creeA: Timestamp
```

**Opérations Firestore (firestore.js) :**

| Fonction | Type | Description |
|----------|------|-------------|
| `creerSalon(codeS, total, quizId)` | setDoc | Crée room en statut 'attente' |
| `lancerPartie(codeS)` | updateDoc | statut → 'en-cours', questionCourante → 0 |
| `passerQuestionSuivante(codeS, idx, total)` | updateDoc | Avance ou termine |
| `terminerSalon(codeS)` | updateDoc | statut → 'termine' |
| `lireRoom(codeS)` | getDoc | Lecture unique (player join) |
| `abonnerSalon(codeS, cb)` | onSnapshot | Écoute temps réel du salon |
| `inscrireJoueur(codeS, uid, prenom)` | setDoc | Crée doc joueur |
| `soumettreReponse(...)` | getDoc + updateDoc | Merge réponse + recalcule score |
| `abonnerJoueurs(codeS, cb)` | onSnapshot (collection) | Liste joueurs temps réel |
| `listerQuizzes()` | getDocs + query | Métadonnées uniquement, tri `creeA` desc |
| `ajouterQuiz(raw, title, count)` | addDoc | Stocke JSON brut complet |
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
      "explanation": "Explication didactique.\n- Point 1\n- Point 2"
    }
  ]
}
```

### Nouveau format Claude (généré par le prompt builder)

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
      "pourquoi": "Explication.\n- Point clé 1"
    }
  ]
}
```

**Champs clés du nouveau format :**
- `bonne_reponse` : lettre `"A"`, `"B"`, `"C"` ou `"D"` (détection du format)
- `options` : objet `{A, B, C, D}` (pas un tableau)
- `difficulte` : entier 1–5 → affiché en `category` comme `"Difficulté X/5"`
- `pourquoi` → `explanation` ; `\n` dans les strings JSON = retour à la ligne
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
```

**Stockage dans Firestore :** le JSON brut original est stocké (`rawData`). La normalisation est appliquée au chargement côté client.

### 9.2 Synchronisation minuterie 60s

```
1. Enseignant avance → passerQuestionSuivante() → updateDoc({ questionDemarreeA: serverTimestamp() })
2. Joueurs et enseignant écoutent salon via onSnapshot
3. questionDemarreeA reçu → calcul elapsed = (Date.now() - questionDemarreeA.toMillis()) / 1000
4. remaining = Math.max(0, 60 - elapsed)
5. setInterval 1s pour mise à jour UI
6. Si remaining ≤ 0 → auto-avance (enseignant uniquement via Dashboard)
```

### 9.3 Tap-to-answer (ScreenQuizLive)

```
1. Joueur appuie sur option
2. confirme = true (désactive toutes les autres options visuellement)
3. onRepondre(idx) appelé immédiatement → soumettreReponse() vers Firestore
4. App → setDernierReponse({ estCorrect, indice }) → setScreen(S.WAITING)
5. Live.salon change → statut 'en-cours', question suivante → setScreen(S.QUIZ_LIVE)
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
6. inscrireJoueur() + setScreen(LOBBY)
```

### 9.6 Leaderboard solo (localStorage)

```
- Clé : 'qcm_scores'
- Structure : [{ name, score, time, group, date }]
- Tri : score décroissant, puis time croissant
- Limité à top 5
- Groupe calculé par getGroupLabel(score, groups)
```

### 9.7 Génération code session

```javascript
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
// Exclut : I, O, 0, 1 → évite confusion visuelle
let code = ''
for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
```

### 9.8 Renderer Markdown (`Md.jsx`)

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

**`isFirebaseConfigured`** : booléen exporté, `true` si `firebaseConfig.apiKey` est défini. Utilisé dans toute l'app pour conditionner les appels Firebase.

**Auth anonyme :** `signInAnon()` appelé au montage de `App`. Retourne `{ uid }` utilisé comme identifiant joueur.

---

## 11. Déploiement

### Workflow GitHub Actions (`deploy.yml`)

1. Déclenché sur push vers `main`
2. `npm ci`
3. `npm run build` → génère `dist/`
4. Upload `dist/` → GitHub Pages

**Attention :** GitHub peut créer automatiquement un second workflow `static.yml` qui déploie les sources brutes (sans build) et peut écraser le déploiement correct. **Ne jamais laisser deux workflows actifs.** Si `static.yml` existe, le supprimer.

### Commandes développement

| Action | Commande |
|--------|----------|
| Développement local | `npm run dev` |
| Build production | `npm run build` |
| Déploiement | `git push origin main` |

---

## 12. Sécurité & administration

### Mot de passe admin

- Constante dans `App.jsx` : `const ADMIN_PASSWORD = '1234'`
- Validation côté client uniquement (pas de vérification serveur)
- Modal prompt affiché sur `handleAdminAccess()` → si correct → `setScreen(S.ADMIN)`

### Authentification Firebase

- Authentification anonyme uniquement
- Pas de compte utilisateur, pas d'email
- `userId` = UID Firebase généré automatiquement, persisté en session

### Sécurité quiz

- Les quiz sont stockés dans Firestore avec accès public en lecture/écriture (règles ouvertes)
- Seul l'accès à l'écran Admin (via mot de passe) permet d'ajouter/supprimer

---

## 13. Règles Firestore

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

> Les règles sont intentionnellement ouvertes (application scolaire interne). En environnement de production exposé, ajouter une validation d'authentification.

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
