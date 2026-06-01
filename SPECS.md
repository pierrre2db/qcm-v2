# Spécifications Fonctionnelles — QCM Live V2

## Vue d'ensemble

Application de quiz interactif multi-joueur synchronisé pour la salle de classe.  
L'enseignant contrôle le rythme. Les élèves jouent simultanément depuis leur smartphone.  
Données (questions, titres, groupes) entièrement séparées du code → outil universel.

---

## Modes de jeu

### Mode Solo (test individuel)
- Pas de Firebase requis
- L'élève entre son prénom, laisse le code vide
- Avancement libre : il passe à la question suivante lui-même
- Score sauvegardé dans le classement local (localStorage, top 5)
- Correction détaillée disponible après les résultats

### Mode Live (classe synchronisée)
- Requiert Firebase configuré
- L'enseignant crée une session → reçoit un code à 6 lettres + QR code
- Les élèves rejoignent via QR code ou en entrant le code manuellement
- L'enseignant contrôle le démarrage et l'avancement des questions
- Tous les joueurs voient la même question au même moment

---

## Parcours Enseignant (Mode Live)

### 1. Création de session
- Clic sur "Créer une session live"
- Génération d'un code de 6 lettres sans ambiguïté (pas de 0/O, 1/I)
- Affichage immédiat du **QR code géant** + code texte
- Le QR code pointe vers l'adresse publique avec `?room=CODE`

### 2. Salle d'attente (Lobby)
- Tableau de bord affiche : QR code, code session, liste des joueurs connectés en temps réel
- Compteur de joueurs connectés
- Bouton **"Lancer la partie"** — désactivé tant qu'aucun joueur n'est connecté
- L'enseignant décide quand tout le monde est prêt

### 3. Déroulement du quiz
- Clic "Lancer la partie" → tous les téléphones passent à la Q1 simultanément
- Tableau de bord enseignant affiche :
  - Numéro de question en cours
  - **Minuterie compte à rebours de 60 secondes** (visuel, barre de progression)
  - Nombre de joueurs ayant répondu / total
  - Bouton **"Question suivante"** (actif dès qu'au moins 1 joueur a répondu)
  - **Avance automatique** à 0 seconde si l'enseignant n'a pas cliqué
- À la dernière question : bouton "Terminer & Voir les résultats"

### 4. Podium
- Clic "Terminer" → tous les joueurs voient leurs résultats individuels
- Tableau de bord affiche le podium top 3
- Bouton "Fermer le salon"

---

## Parcours Élève (Mode Live)

### 1. Connexion
- Saisie du prénom + code de session (ou scan QR code qui pré-remplit le code)
- Clic "Se connecter & Commencer"

### 2. Salle d'attente
- Écran "En attente du lancement..." avec :
  - Prénom affiché
  - Code de session affiché
  - Liste des autres joueurs déjà connectés
  - Animation d'attente
  - Message : "Le professeur va bientôt lancer la partie !"

### 3. Quiz synchronisé
- Quand l'enseignant lance → écran de question apparaît automatiquement
- Une question affichée à la fois
- Minuterie visible (synchronisée avec l'enseignant)
- Après avoir répondu : écran intermédiaire "En attente de la prochaine question..."  
  avec indication si la réponse était correcte ou non
- La question suivante apparaît automatiquement quand l'enseignant avance

### 4. Résultats
- Après la dernière question : score final, groupe, retour personnalisé
- Bouton "Voir la correction détaillée"

---

## Architecture Firestore

```
salles/{codeSalon}                           ← document de session
  statut: 'attente' | 'en-cours' | 'termine'
  questionCourante: nombre                   ← indice 0..N-1, -1 = lobby
  questionDemarreeA: horodatage              ← pour la minuterie 60s
  totalQuestions: nombre
  creeA: horodatage

salles/{codeSalon}/joueurs/{idUtilisateur}   ← document joueur
  idUtilisateur: chaîne
  prenom: chaîne
  reponses: { [indiceQuestion]: indiceChoisi }
  score: nombre
  statut: 'attente' | 'en-cours' | 'termine'
  groupe: chaîne
  tempsPasse: chaîne
  derniereMiseAJour: horodatage
```

---

## Règles de sécurité Firestore

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
  }
}
```

> ⚠️ Les règles actuelles n'incluent que `/players/{userId}` — à mettre à jour pour inclure le document `/rooms/{roomId}` lui-même.

---

## Architecture technique

### Pile technologique
- **Vite + React** (application monopage)
- **Tailwind CSS v4**
- **Firebase v11** — Firestore + Authentification anonyme
- **QRious** — génération de QR codes
- **GitHub Actions** — déploiement automatique sur GitHub Pages

### Structure des fichiers
```
src/
  data/
    afsca.json                ← questions + métadonnées + groupes de score
    [autre-matiere].json      ← futures matières (même format)
  lib/
    firebase.js               ← configuration + authentification anonyme
    firestore.js              ← lecture/écriture : salon, joueurs, abonnements
  hooks/
    useQuizStore.js           ← état local du quiz (solo)
    useLiveQuiz.js            ← état synchronisé (live) ← NOUVEAU
  composants/
    Entete.jsx                ← Header
    Notification.jsx          ← Toast
    EcranAccueil.jsx          ← accueil + formulaire de connexion
    EcranLobby.jsx            ← salle d'attente joueur ← NOUVEAU
    EcranQuiz.jsx             ← quiz solo (inchangé)
    EcranQuizLive.jsx         ← quiz synchronisé ← NOUVEAU
    EcranAttente.jsx          ← "en attente question suivante" ← NOUVEAU
    EcranResultat.jsx         ← résultat final
    EcranCorrection.jsx       ← correction détaillée
    EcranTableauBord.jsx      ← tableau de bord enseignant (refactorisé)
    EcranPodium.jsx           ← podium top 3
  App.jsx                     ← orchestration des écrans + logique Firebase
  index.css
```

> Note : les noms de fichiers restent en anglais dans le code (convention React) mais les labels ci-dessus indiquent leur rôle en français.

### Format JSON universel (pour ajouter une matière)
```json
{
  "meta": {
    "titre": "Titre affiché dans l'en-tête",
    "sousTitre": "Sous-titre de l'en-tête",
    "badge": "Texte du badge sur l'écran d'accueil",
    "theme": "emerald",
    "piedDePage": "Texte du pied de page",
    "liensBasDePage": [{ "libelle": "...", "href": "..." }]
  },
  "groupes": [
    { "scoreMax": 4,   "libelle": "Insuffisant", "couleur": "rouge",  "titre": "...", "retour": "..." },
    { "scoreMax": 8,   "libelle": "Satisfaisant", "couleur": "orange", "titre": "...", "retour": "..." },
    { "scoreMax": 999, "libelle": "Expert",       "couleur": "vert",   "titre": "...", "retour": "..." }
  ],
  "questions": [
    {
      "id": 1,
      "categorie": "Catégorie",
      "question": "Texte de la question ?",
      "options": ["Réponse A", "Réponse B", "Réponse C"],
      "bonneReponse": 0,
      "explication": "Explication didactique après correction."
    }
  ]
}
```

---

## Déploiement

| Action | Commande |
|--------|----------|
| Développement local | `npm run dev` |
| Compilation | `npm run build` |
| Déploiement | `git push origin main` → GitHub Actions automatique |

**Adresse de production :** `https://pierrre2db.github.io/qcm-v2/`

---

## Feuille de route

| Statut | Fonctionnalité |
|--------|----------------|
| ✅ | Quiz solo fonctionnel |
| ✅ | Mode Live basique (progression individuelle) |
| ✅ | Tableau de bord enseignant temps réel |
| ✅ | Podium final |
| ✅ | Classement local solo |
| ✅ | Déploiement GitHub Pages automatique |
| ✅ | Firebase configuré (qcm-live-class) |
| 🔲 | QR code visible dès la création de session |
| 🔲 | Salle d'attente joueurs (lobby) |
| 🔲 | Quiz synchronisé — contrôle enseignant |
| 🔲 | Minuterie 60s par question avec avance automatique |
| 🔲 | Écran "En attente de la prochaine question" joueur |
| 🔲 | Mise à jour règles Firestore (salon + joueurs) |
| 🔲 | Mélange des questions (optionnel) |
| 🔲 | Durée configurable par quiz |
