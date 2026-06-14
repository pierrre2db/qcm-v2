# QCM Live — Évaluation interactive en temps réel

[![Demo Live](https://img.shields.io/badge/🎮_Demo_Live-pierrre2db.github.io/qcm--v2-6c2bd9?style=for-the-badge)](https://pierrre2db.github.io/qcm-v2/)
[![GitHub Pages](https://img.shields.io/badge/Déployé_sur-GitHub_Pages-222?style=for-the-badge&logo=github)](https://github.com/pierrre2db/qcm-v2)

Application de quiz interactif multi-joueur pour la salle de classe — synchronisation en temps réel, dashboard enseignant, images par question et podium final.

---

## 🚀 Tester sans installation

**L'app est déjà en ligne et fonctionnelle :**  
👉 **https://pierrre2db.github.io/qcm-v2/**

| Rôle | Comment tester |
|------|---------------|
| **Élève (solo)** | Onglet "Entraînement Solo" → saisir prénom → choisir un quiz → Commencer |
| **Élève (live)** | Onglet "Rejoindre la Classe" → saisir prénom + code session |
| **Enseignant** | Bouton "Créer une session live" → partager le QR code ou le code 6 lettres |
| **Admin** | Bouton ⚙️ Administration → mot de passe : `1234` |

> Le mode Live nécessite que l'enseignant ait créé une session active. Le mode Solo fonctionne sans aucune connexion externe.

---

## Fonctionnalités

- **Mode Solo** — quiz en autonomie, score sauvegardé localement (top 5)
- **Mode Classe (Live)** — salon synchronisé via Firebase, QR code + code 6 lettres
- **Dashboard enseignant** — stats temps réel, timer 60s, avancement question par question
- **Images par question** — upload Cloudinary depuis l'admin, affichage dans les quiz
- **Import JSON** — coller/déposer un fichier JSON pour ajouter un quiz
- **Générateur de prompt NotebookLM** — génère un prompt ancré sur les documents sources
- **Correction détaillée** — chaque question avec explication en Markdown
- **Leaderboard solo** — top 5 en localStorage

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework UI | React 19 + Vite |
| CSS | Tailwind CSS v4 |
| Base de données | Firebase Firestore v12 (temps réel via `onSnapshot`) |
| Auth | Firebase Auth anonyme |
| Stockage images | Cloudinary CDN (upload direct navigateur) |
| QR code | QRious (canvas) |
| CI/CD | GitHub Actions → GitHub Pages |

---

## Forker et déployer sa propre instance

### 1. Cloner et installer

```bash
git clone https://github.com/pierrre2db/qcm-v2.git
cd qcm-v2
npm install
npm run dev   # → http://localhost:5174
```

### 2. Configurer Firebase (requis pour le mode Live)

1. Créer un projet sur [console.firebase.google.com](https://console.firebase.google.com)
2. Ajouter une application Web → copier le bloc `firebaseConfig`
3. Remplacer les valeurs dans `src/lib/firebase.js`
4. Activer **Firestore Database** (mode test) avec ces règles :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if true; }
  }
}
```

5. Activer **Authentication → Connexion anonyme**

> Sans Firebase, l'app fonctionne en mode solo uniquement.

### 3. Configurer Cloudinary (requis pour les images)

1. Créer un compte sur [cloudinary.com](https://cloudinary.com)
2. Créer un **Upload Preset** en mode **Unsigned**
3. Remplacer `CLOUD_NAME` et `UPLOAD_PRESET` dans `src/lib/cloudinary.js`

### 4. Changer le mot de passe admin

Dans `src/App.jsx`, ligne :
```js
const ADMIN_PASSWORD = '1234'
```
Remplacer `'1234'` par votre mot de passe.

### 5. Déployer sur GitHub Pages

1. Pousser le repo sur GitHub
2. **Settings → Pages → Source : GitHub Actions**
3. Chaque `git push origin main` déclenche le build et déploiement automatique (~2 min)

> ⚠️ Si GitHub crée automatiquement un second workflow `static.yml`, le supprimer immédiatement — il déploie les sources brutes sans build.

---

## Format JSON des quiz

```json
{
  "meta": {
    "title": "Titre affiché dans l'en-tête",
    "subtitle": "Sous-titre",
    "badge": "Texte du badge accueil",
    "theme": "emerald",
    "footer": "© 2026 - Votre organisation",
    "footerLinks": [{ "label": "Lien", "href": "https://..." }]
  },
  "groups": [
    { "maxScore": 4,   "label": "Insuffisant", "color": "red",   "title": "...", "feedback": "..." },
    { "maxScore": 8,   "label": "Satisfaisant", "color": "amber", "title": "...", "feedback": "..." },
    { "maxScore": 999, "label": "Expert",        "color": "green", "title": "...", "feedback": "..." }
  ],
  "questions": [
    {
      "id": 1,
      "category": "Difficulté 3/5",
      "question": "Question avec **gras** et *italique* ?",
      "options": ["Réponse A", "Réponse B", "Réponse C", "Réponse D"],
      "correctIndex": 0,
      "explanation": "Explication didactique.\n- Point clé 1\n- Point clé 2",
      "imageUrl": null
    }
  ]
}
```

Le format généré par NotebookLM/Claude (avec `bonnes_reponses`, `options` objet A/B/C/D) est également supporté via normalisation automatique.

---

## Structure des fichiers

```
qcm-v2/
├── .github/workflows/deploy.yml    ← seul workflow actif
├── src/
│   ├── data/afsca.json             ← quiz intégré par défaut
│   ├── lib/
│   │   ├── firebase.js             ← config Firebase
│   │   ├── firestore.js            ← CRUD + abonnements temps réel
│   │   ├── normalizeQuiz.js        ← conversion formats JSON
│   │   └── cloudinary.js           ← upload image → CDN
│   ├── components/                 ← tous les écrans et composants
│   └── App.jsx                     ← orchestrateur central
└── vite.config.js                  ← base: '/qcm-v2/' (GitHub Pages)
```

---

*Projet développé pour un usage scolaire interne — [Voir la spec complète](SPECS.md)*
