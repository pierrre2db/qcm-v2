# QCM Live — Évaluation en Temps Réel

Application de quiz interactif multi-joueur pour la classe, avec suivi en direct des élèves, dashboard enseignant et podium final.

**Demo live :** `https://[votre-pseudo].github.io/qcm-v2/`

---

## Fonctionnalités

- **Mode Solo** — quiz sans connexion Firebase, score sauvegardé localement
- **Mode Classe (Live)** — l'enseignant crée un salon (code 6 lettres + QR code), les élèves rejoignent et leur progression s'affiche en temps réel
- **Dashboard enseignant** — tableau de suivi live, statistiques, podium final
- **Correction détaillée** — chaque question avec explication didactique
- **Leaderboard local** — top 5 scores solo en localStorage
- **Universel** — questions dans un fichier JSON séparé, facile à remplacer

## Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Firebase Firestore](https://firebase.google.com/) (temps réel)
- [QRious](https://github.com/neocotic/qrious) (génération QR codes)

---

## Installation locale

```bash
git clone https://github.com/[votre-pseudo]/qcm-v2.git
cd qcm-v2
npm install
npm run dev
```

## Configuration Firebase (requis pour le mode Live)

1. Créer un projet sur [console.firebase.google.com](https://console.firebase.google.com)
2. Ajouter une application Web → copier le bloc `firebaseConfig`
3. Coller les clés dans `src/lib/firebase.js`
4. Activer **Firestore Database** (mode test) avec ces règles :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId}/players/{userId} {
      allow read, write: if true;
    }
  }
}
```

5. Activer **Authentication → Anonyme**

Sans Firebase, l'app fonctionne en mode solo uniquement.

---

## Déploiement GitHub Pages

Déploiement automatique via GitHub Actions à chaque push sur `main`.

1. Pousser ce repo sur GitHub
2. Dans Settings → Pages → Source : **GitHub Actions**
3. Chaque `git push` déclenche un build et déploiement automatique

---

## Ajouter un nouveau QCM

1. Créer `src/data/[matiere].json` avec ce format :

```json
{
  "meta": {
    "title": "Titre du quiz",
    "subtitle": "Sous-titre",
    "badge": "Multi-joueur en temps réel",
    "theme": "emerald",
    "footer": "© 2026 - Votre organisation",
    "footerLinks": []
  },
  "groups": [
    { "maxScore": 4, "label": "Insuffisant", "color": "red", "title": "...", "feedback": "..." },
    { "maxScore": 8, "label": "Satisfaisant", "color": "amber", "title": "...", "feedback": "..." },
    { "maxScore": 999, "label": "Expert", "color": "green", "title": "...", "feedback": "..." }
  ],
  "questions": [
    {
      "id": 1,
      "category": "Catégorie",
      "question": "Question ?",
      "options": ["Réponse A", "Réponse B", "Réponse C"],
      "correctIndex": 0,
      "explanation": "Explication didactique..."
    }
  ]
}
```

2. Dans `src/App.jsx` ligne 3, remplacer :
```js
import afscaData from './data/afsca.json'
```
par :
```js
import data from './data/[matiere].json'
```

---

## Matières disponibles

| Fichier | Sujet | Questions |
|---------|-------|-----------|
| `afsca.json` | Hygiène & Sécurité Alimentaire AFSCA | 10 |

---

*Déploiement automatique via GitHub Actions — compatible mobile & desktop*
