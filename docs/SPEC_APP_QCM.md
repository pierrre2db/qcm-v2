# Spécification Technique — Application de Gestion QCM

**Version :** 2.2  
**Date :** 2026-06-15  
**Statut :** Draft — implémentation active sur qcm-v2  

---

## 1. Contexte et objectifs

Application web de gestion et passage de QCM en **mode présentiel interactif** :

- Un **écran principal** (projecteur / TV) affiche la question en cours + un QR code
- Les **apprenants** scannent le QR avec leur mobile, se connectent, et répondent
- L'**admin / créateur** pilote la session depuis son interface de gestion

### Objectifs

- Gérer et créer des QCM structurés (texte + images)
- Afficher les questions en plein écran avec QR code généré automatiquement
- Permettre la réponse mobile après scan + login
- Stocker les résultats et les consulter en temps réel
- Déployer via Docker sur VPS

---

## 2. Périmètre fonctionnel

### 2.1 Fonctionnalités incluses

- Création, édition, suppression de questionnaires
- Trois types de questions : choix unique, choix multiple, vrai/faux
- Support d'images dans les questions (énoncé et/ou propositions)
- Gestion de trois rôles : Admin, Créateur, Apprenant
- **Mode présentation** : affichage plein écran question + QR code
- **Génération QR code** par l'admin pour chaque session
- **Réponse mobile** via scan QR + login obligatoire
- Correction automatique et score
- Tableau de résultats en temps réel (admin/créateur)
- Déploiement Docker sur VPS

### 2.2 Fonctionnalités exclues (hors scope v1)

- Authentification OAuth / SSO
- Réponses libres (texte)
- Notifications push
- Export PDF des résultats
- Multi-tenant (une seule instance par déploiement)

---

## 3. Architecture globale

```
┌─────────────────────────────────────────────────────┐
│                        VPS                          │
│                                                     │
│  ┌─────────────┐    ┌──────────────────────────┐   │
│  │   Nginx     │───▶│   Frontend (HTML/JS/CSS) │   │
│  │  (reverse   │    │   servi statiquement     │   │
│  │   proxy)    │    └──────────────────────────┘   │
│  │             │                                    │
│  │             │    ┌──────────────────────────┐   │
│  │             │───▶│   Backend FastAPI        │   │
│  │             │    │   (Python)               │   │
│  └─────────────┘    └────────────┬─────────────┘   │
│                                  │                  │
│                          ┌───────▼──────┐           │
│                          │   SQLite DB  │           │
│                          └──────────────┘           │
└─────────────────────────────────────────────────────┘
```

### 3.1 Conteneurs Docker

```yaml
# docker-compose.yml (structure)
services:
  backend:
    build: ./backend
    # FastAPI + Uvicorn
    # Monte le volume SQLite
    volumes:
      - ./data/db:/app/db
      - ./data/images:/app/static/images

  frontend:
    build: ./frontend
    # Nginx servant les fichiers statiques
    # Proxy /api → backend

  # Optionnel : Certbot pour HTTPS
```

---

## 4. Identité utilisateur et avatars

### 4.1 Format d'identité publique

Chaque apprenant s'affiche sous forme `Lord [Prénom]` (ex: **Lord Prosper**).

- À l'inscription : l'apprenant saisit son **prénom** uniquement
- Pseudonyme public affiché = `"Lord " + prénom` (ex: "Lord Prosper")
- Nom réel non visible des autres apprenants (protection §4.4)
- L'admin voit le nom complet + email dans le panel de gestion

### 4.2 Avatars prédéfinis — thème cuisine

80 avatars vectoriels (SVG ou PNG 256×256) thématisés autour de la **culture culinaire mondiale**.

**Attribution :** aléatoire à l'inscription (1 parmi 80, sans doublon dans une session si possible).

**Catégories suggérées (16 × 5 avatars) :**

| Catégorie | Exemples d'avatars |
|---|---|
| Chefs légendaires stylisés | Chef Antoine, Chef Ming, Chef Maria, Chef Ali, Chef Jean |
| Ustensiles vivants | Couteau Ninja, Fouet Funky, Poêle Sage, Louche Royale, Spatule Zen |
| Fruits & légumes | Avocat Cool, Piment Rouge, Artichaut Boss, Truffe Mystère, Radis Punk |
| Plats du monde | Sushi Lord, Taco Wild, Croissant King, Dim Sum Hero, Falafel Star |
| Desserts | Macaron Diva, Tiramisu Zen, Mochi Pop, Baklava Prince, Churro Kid |
| Épices & herbes | Safran Gold, Basilic Fresh, Cardamome Wise, Piment Loco, Vanille Soft |
| Boissons | Espresso Dark, Matcha Monk, Kombucha Free, Chai Master, Kéfir Cool |
| Techniques culinaires | Flambé King, Fermenté Sage, Fumé Boss, Grillé Wild, Confit Zen |
| Animaux gastronomes | Cochon Gourmet, Homard Royal, Truffe Pig, Coquille Saint-Canard, Oie Foie |
| Marchés du monde | Souk Spice, Tsukiji Ninja, Rungis Boss, Borough Hero, Mercado Soul |
| Street food | Wok Rider, Kebab King, Hot Dog Chief, Bánh Mì Rider, Pho Master |
| Fromages | Comté Sage, Brie Doux, Roquefort Dark, Gouda Lord, Manchego Cool |
| Pains & viennoiseries | Baguette Warrior, Pretzel Punk, Naan Guru, Focaccia Star, Pita Hero |
| Sauces | Sriracha Fire, Pesto Zen, Miso Soul, Harissa Wild, Béarnaise King |
| Ustensiles asiatiques | Baguettes Zen, Wok Master, Claypot Sage, Bamboo Steamer, Mortar Boss |
| Légumes racines | Betterave Punk, Gingembre Fire, Curcuma Gold, Wasabi Ninja, Raifort Wild |

### 4.3 Stockage avatar

```sql
-- Dans table users
avatar_id   INTEGER NOT NULL,   -- 1 à 80, assigné aléatoirement à l'inscription
```

Fichiers avatars : `frontend/dist/avatars/avatar_{01..80}.svg`  
Convention nommage : `avatar_01.svg` à `avatar_80.svg`

### 4.4 Protection des données utilisateur

**Principe : séparation identité réelle / identité publique.**

| Donnée | Visible par | Notes |
|---|---|---|
| Email | Admin uniquement | Jamais affiché aux autres apprenants |
| Nom de famille | Admin uniquement | Non affiché en session |
| Prénom | Apprenant lui-même + Admin | Affiché seulement sous forme "Lord Prénom" |
| Pseudo `Lord X` | Tous (dans session) | Identité publique uniquement |
| Avatar | Tous (dans session) | Image, pas de lien vers profil |
| Score | Tous (leaderboard) | Affiché sous pseudo + avatar |
| Réponses détaillées | Apprenant lui-même + Admin | Pas exposées aux autres |

**Règles techniques :**
- L'API `/api/sessions/{id}/resultats` retourne `pseudo` + `avatar_id` + `score` — jamais `email` ni `nom`
- L'API `/api/sessions/{id}/resultats/me` retourne le détail complet pour l'utilisateur connecté uniquement
- Hash bcrypt mot de passe, jamais en clair en base ni en log
- Admin peut voir `email` uniquement via `/api/users` (route protégée rôle admin)

---

## 5. Rôles et permissions

| Action | Admin | Créateur | Apprenant |
|---|---|---|---|
| Créer un QCM | ✅ | ✅ | ❌ |
| Modifier un QCM | ✅ | ✅ (propres QCM) | ❌ |
| Supprimer un QCM | ✅ | ✅ (propres QCM) | ❌ |
| Lancer session présentation | ✅ | ✅ | ❌ |
| Générer QR code session | ✅ | ✅ | ❌ |
| Naviguer entre questions | ✅ | ✅ | ❌ |
| Répondre via mobile (scan QR) | ✅ | ✅ | ✅ |
| Consulter ses résultats | ✅ | ✅ | ✅ |
| Consulter résultats de tous | ✅ | ✅ (propres QCM) | ❌ |
| Gérer les utilisateurs | ✅ | ❌ | ❌ |

---

## 5. Types de questions

### 5.1 Support d'images

Toute question peut comporter une image associée à son **énoncé** et/ou à chacune de ses **propositions**.

- Stockage : fichier uploadé sur le serveur, chemin relatif stocké en base
- Formats acceptés : `.png`, `.jpg`, `.gif`, `.svg`, `.webp`
- Servies via Nginx depuis `/static/images/`
- Structure : `images/<qcmId>/<questionId>_enonce.ext`

### 5.2 Choix unique

- Sélectionner **une seule réponse** parmi N propositions
- UI mobile : boutons radio larges (touch-friendly)
- Score : bonne réponse = 1 point, mauvaise = 0

### 5.3 Choix multiple

- Sélectionner **une ou plusieurs réponses** parmi N propositions
- UI mobile : cases à cocher larges
- Score : toutes bonnes cochées ET aucune mauvaise = 1 point, sinon 0
- Option `scorePartiel` configurable par le créateur

### 5.4 Vrai / Faux

- Répondre **Vrai ou Faux** à une affirmation
- UI mobile : deux gros boutons (Vrai / Faux)
- Score : bonne réponse = 1 point, mauvaise = 0

---

## 6. Modèle de données (SQLite)

### 6.1 Table `users`

```sql
CREATE TABLE users (
    id                TEXT PRIMARY KEY,          -- UUID v4
    nom               TEXT NOT NULL,             -- nom réel, visible admin uniquement
    prenom            TEXT NOT NULL,             -- prénom, base du pseudo public
    email             TEXT UNIQUE NOT NULL,      -- identifiant de connexion
    role              TEXT NOT NULL              -- 'admin' | 'createur' | 'apprenant'
                      CHECK(role IN ('admin','createur','apprenant')),
    mot_de_passe_hash TEXT NOT NULL,             -- bcrypt hash
    avatar_id         INTEGER NOT NULL           -- 1 à 80, assigné aléatoirement
                      CHECK(avatar_id BETWEEN 1 AND 80),
    -- pseudo public calculé : "Lord " || prenom (non stocké, calculé à la volée)
    created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 6.2 Table `questionnaires`

```sql
CREATE TABLE questionnaires (
    id              TEXT PRIMARY KEY,      -- UUID v4
    titre           TEXT NOT NULL,
    description     TEXT,
    createur_id     TEXT NOT NULL REFERENCES users(id),
    duree_minutes   INTEGER,              -- NULL = illimitée
    score_partiel   INTEGER NOT NULL DEFAULT 0,  -- 0 | 1
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 6.3 Table `questions`

```sql
CREATE TABLE questions (
    id              TEXT PRIMARY KEY,      -- UUID v4
    questionnaire_id TEXT NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
    ordre           INTEGER NOT NULL,      -- position dans le QCM
    type            TEXT NOT NULL          -- 'choix_unique' | 'choix_multiple' | 'vrai_faux'
                    CHECK(type IN ('choix_unique','choix_multiple','vrai_faux')),
    enonce          TEXT,                  -- NULL si question 100% image
    image_path      TEXT,                  -- chemin relatif /static/images/...
    reponse_correcte INTEGER               -- pour vrai_faux : 1=Vrai, 0=Faux
);
```

### 6.4 Table `propositions`

```sql
CREATE TABLE propositions (
    id          TEXT PRIMARY KEY,          -- UUID v4
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    ordre       INTEGER NOT NULL,
    texte       TEXT,                      -- NULL si proposition = image seule
    image_path  TEXT,                      -- chemin relatif /static/images/...
    correcte    INTEGER NOT NULL DEFAULT 0 -- 0 | 1
    -- contrainte : texte OR image_path doit être non NULL
);
```

### 6.5 Table `sessions`

Une **session** = une instance de passage d'un QCM à un moment donné (événement de classe, formation, etc.).

```sql
CREATE TABLE sessions (
    id                  TEXT PRIMARY KEY,  -- UUID v4
    questionnaire_id    TEXT NOT NULL REFERENCES questionnaires(id),
    createur_id         TEXT NOT NULL REFERENCES users(id),
    statut              TEXT NOT NULL DEFAULT 'en_attente'
                        CHECK(statut IN ('en_attente','en_cours','terminee')),
    question_courante_id TEXT REFERENCES questions(id),  -- NULL = pas démarrée
    qr_token            TEXT UNIQUE NOT NULL,            -- token dans l'URL du QR
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    started_at          TEXT,
    ended_at            TEXT
);
```

### 6.6 Table `reponses`

```sql
CREATE TABLE reponses (
    id              TEXT PRIMARY KEY,      -- UUID v4
    session_id      TEXT NOT NULL REFERENCES sessions(id),
    apprenant_id    TEXT NOT NULL REFERENCES users(id),
    question_id     TEXT NOT NULL REFERENCES questions(id),
    proposition_ids TEXT,                  -- JSON array d'IDs pour choix unique/multiple
    reponse_vf      INTEGER,               -- pour vrai_faux : 1=Vrai, 0=Faux
    correcte        INTEGER NOT NULL DEFAULT 0,
    points          REAL NOT NULL DEFAULT 0,
    repondu_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(session_id, apprenant_id, question_id)
);
```

---

## 7. API REST (FastAPI)

### 7.1 Authentification

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Login email + mot de passe → JWT |
| POST | `/api/auth/logout` | Invalider token |
| GET | `/api/auth/me` | Profil utilisateur courant |

Auth via **JWT Bearer token** dans header `Authorization`.

### 7.2 Utilisateurs (Admin)

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/users` | Lister tous les utilisateurs |
| POST | `/api/users` | Créer un utilisateur |
| PUT | `/api/users/{id}` | Modifier utilisateur |
| DELETE | `/api/users/{id}` | Supprimer utilisateur |

### 7.3 Questionnaires

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/questionnaires` | Lister QCM (filtré selon rôle) |
| POST | `/api/questionnaires` | Créer QCM |
| GET | `/api/questionnaires/{id}` | Détail QCM |
| PUT | `/api/questionnaires/{id}` | Modifier QCM |
| DELETE | `/api/questionnaires/{id}` | Supprimer QCM |

### 7.4 Questions et propositions

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/questionnaires/{id}/questions` | Ajouter question |
| PUT | `/api/questions/{id}` | Modifier question |
| DELETE | `/api/questions/{id}` | Supprimer question |
| POST | `/api/questions/{id}/image` | Upload image énoncé |
| POST | `/api/propositions/{id}/image` | Upload image proposition |

### 7.5 Sessions et QR code

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/sessions` | Créer session (génère `qr_token`) |
| GET | `/api/sessions/{id}` | Détail session |
| POST | `/api/sessions/{id}/start` | Démarrer session |
| POST | `/api/sessions/{id}/next` | Passer à question suivante |
| POST | `/api/sessions/{id}/end` | Terminer session |
| GET | `/api/sessions/{id}/qr` | Retourne URL QR + image PNG du QR code |
| GET | `/api/join/{qr_token}` | Accès apprenant via scan QR → infos session |

### 7.6 Réponses

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/sessions/{id}/reponses` | Soumettre réponse (apprenant connecté) |
| GET | `/api/sessions/{id}/resultats` | Résultats session (admin/créateur) |
| GET | `/api/sessions/{id}/resultats/me` | Résultats personnels (apprenant) |

### 7.7 WebSocket (optionnel v1, requis v2)

```
WS /ws/session/{id}
```

Permet mise à jour en temps réel sur l'écran principal (passage question suivante, comptage réponses) sans polling.

---

## 8. Flux utilisateurs

### 8.1 Flux Admin/Créateur — Lancer session

```
1. Dashboard → sélectionner QCM → "Lancer une session"
2. Backend crée session + génère qr_token unique
3. GET /api/sessions/{id}/qr → URL de type https://monapp.com/join/{qr_token}
4. Afficher QR code sur écran principal (mode plein écran)
5. Cliquer "Question suivante" → écran principal affiche Q1 + QR code actif
6. Répéter jusqu'à dernière question → "Terminer session"
7. Consulter résultats en temps réel
```

### 8.2 Flux Apprenant — Répondre via mobile

```
1. Scan QR code avec mobile
2. Navigateur ouvre https://monapp.com/join/{qr_token}
3. Si non connecté → redirect /login?next=/join/{qr_token}
4. Login email + mot de passe → JWT stocké localStorage
5. Redirect /join/{qr_token} → affichage question courante de la session
6. Répondre → POST /api/sessions/{id}/reponses
7. Confirmation + attente question suivante
8. Score final affiché à la fin de la session
```

### 8.3 Écran principal (mode présentation)

- Vue dédiée, fullscreen, lisible à distance
- Affiche : énoncé + image + propositions (texte masqué ou visible selon config)
- QR code affiché en coin ou centré avant lancement question
- Compte réponses reçues en temps réel (via polling ou WebSocket)

---

## 9. Interface utilisateur

### 9.1 Vues

| Vue | Route | Rôles | Description |
|---|---|---|---|
| Login | `/login` | Tous | Formulaire email + mot de passe |
| Dashboard | `/dashboard` | Tous | Accueil selon rôle |
| Liste QCM | `/qcm` | Tous | Cards des QCM disponibles |
| Créer/Éditer QCM | `/qcm/new`, `/qcm/:id/edit` | Admin, Créateur | Formulaire QCM + questions |
| Présentation | `/session/:id/present` | Admin, Créateur | Écran principal fullscreen |
| Rejoindre | `/join/:qr_token` | Tous | Vue mobile réponse |
| Résultats | `/session/:id/results` | Admin, Créateur, Apprenant (limité) | Tableau résultats |
| Admin users | `/admin/users` | Admin | CRUD utilisateurs |

### 9.2 Responsive

- **Desktop** (≥1024px) : interface admin/créateur, vue présentation
- **Mobile** (≥320px) : vue `/join` optimisée touch, boutons larges min 44px
- La vue `/join` doit fonctionner sur iOS Safari et Android Chrome

### 9.3 Composants clés

| Composant | Description |
|---|---|
| `LoginForm` | Email + mot de passe + gestion erreur |
| `QcmEditor` | Formulaire QCM + ajout dynamique de questions |
| `QuestionEditor` | Éditeur question avec type, énoncé, image, propositions |
| `PresentationView` | Écran fullscreen question + QR code + compteur réponses |
| `JoinView` | Vue mobile après scan : question + réponse touch |
| `ResultsTable` | Tableau résultats par apprenant et par question |
| `Leaderboard` | Podium top 3 + liste classés ≥ 50% + zone < 50% |
| `AvatarPicker` | Affichage avatar assigné (non modifiable par l'apprenant) |
| `QrCodeDisplay` | Génère et affiche QR code PNG depuis URL |
| `UserManager` | Table CRUD utilisateurs (admin) |

---

## 10. Leaderboard et podium

### 10.1 Déclenchement

Affiché automatiquement à la fin d'une session (quand admin clique "Terminer session").  
Visible sur **écran principal** (plein écran) ET sur **mobile** des apprenants.

### 10.2 Structure du leaderboard

```
┌──────────────────────────────────────────────────────┐
│                  🏆 CLASSEMENT FINAL                  │
│                                                      │
│         🥈              🥇              🥉            │
│    [Avatar]        [Avatar]        [Avatar]           │
│   Lord Marco      Lord Prosper    Lord Yuki           │
│     87 %           95 %            80 %              │
│   (2e place)      (1e place)      (3e place)         │
│                                                      │
│ ──────────────── Les challengers ─────────────────── │
│  4.  [Av] Lord Amina     74 %                        │
│  5.  [Av] Lord Felix     68 %                        │
│  6.  [Av] Lord Sara      52 %                        │
│                                                      │
│ ─────────────── En dehors du podium ──────────────── │
│  [Av] Lord Theo    45 %   ░░░░░░░░░░ (grisé)         │
│  [Av] Lord Lena    38 %   ░░░░░░░░░░ (grisé)         │
└──────────────────────────────────────────────────────┘
```

### 10.3 Règles d'affichage

| Zone | Critère | Affichage |
|---|---|---|
| **Podium** | Top 3 scores | Avatar large + pseudo + score % + médaille 🥇🥈🥉 |
| **Challengers** | Rang 4+ ET score ≥ 50% | Avatar petit + pseudo + score % + rang |
| **En dehors** | Score < 50% | Avatar grisé + pseudo + score % (sans rang) |

- Scores **triés décroissant** par `(points_obtenus / points_total) * 100`
- Égalité → tri par `repondu_at` le plus rapide (premier à répondre gagne)
- Le podium affiche **toujours les 3 premières places**, même si score < 50%
- Zone "en dehors" masquable par l'admin (option toggle)
- Sur mobile : scroll vertical, podium en haut fixé

### 10.4 Données API pour leaderboard

```json
// GET /api/sessions/{id}/leaderboard
{
  "session_id": "s1",
  "questionnaire_titre": "Gastronomie Mondiale",
  "total_questions": 10,
  "classement": [
    {
      "rang": 1,
      "pseudo": "Lord Prosper",
      "avatar_id": 42,
      "score_pct": 95.0,
      "points": 19,
      "total": 20,
      "zone": "podium"
    },
    {
      "rang": 4,
      "pseudo": "Lord Amina",
      "avatar_id": 7,
      "score_pct": 74.0,
      "points": 14,
      "total": 20,
      "zone": "challenger"
    },
    {
      "rang": 7,
      "pseudo": "Lord Theo",
      "avatar_id": 15,
      "score_pct": 45.0,
      "points": 9,
      "total": 20,
      "zone": "dehors"
    }
  ]
}
```

**Champ `zone` :** `"podium"` (rang 1-3) | `"challenger"` (rang 4+ et ≥ 50%) | `"dehors"` (< 50%)

### 10.5 Inscription et avatar

**Flux inscription apprenant :**

1. GET `/api/join/{qr_token}` → si non connecté → redirect `/register?next=/join/{qr_token}`
2. Formulaire : prénom + email + mot de passe
3. Backend assigne `avatar_id` = random parmi 1-80 (sans doublon dans session active si possible)
4. Redirect vers `/join/{qr_token}` → pseudo affiché = `"Lord " + prénom`

**Endpoint inscription :**
```
POST /api/auth/register
Body: { prénom, email, mot_de_passe }
Response: { token, user: { id, pseudo, avatar_id } }
```

---

## 12. Génération du QR code

- À la création d'une session, backend génère un `qr_token` (UUID v4)
- URL encodée dans le QR : `https://<domaine>/join/<qr_token>`
- QR code généré côté **backend** via lib Python (`qrcode`) → retourné en PNG base64
- Affiché sur écran principal ET téléchargeable

```python
# Exemple backend
import qrcode, io, base64

def generate_qr(url: str) -> str:
    img = qrcode.make(url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()
```

---

## 13. Sécurité

- Mots de passe hashés **bcrypt** (jamais en clair)
- Auth via **JWT** (expiry 8h), stocké en `localStorage` côté client
- Toutes routes API protégées sauf `/api/auth/login` et `/api/join/:token`
- Vérification rôle côté backend sur chaque endpoint sensible
- HTTPS obligatoire en production (Nginx + Let's Encrypt)
- `qr_token` à usage non limité mais lié à session (expire quand session terminée)

---

## 14. Gestion des erreurs

| Situation | Comportement |
|---|---|
| Scan QR session terminée | Page d'erreur explicite "Session terminée" |
| Réponse déjà soumise pour cette question | HTTP 409, message "Réponse déjà enregistrée" |
| Token JWT expiré | HTTP 401 → redirect login |
| Upload image format invalide | HTTP 422, message format acceptés |
| Question sans énoncé ni image | HTTP 422, validation backend |
| Session sans question | Impossible de démarrer, HTTP 400 |

---

## 15. Déploiement Docker

### 13.1 Structure projet

```
qcm-app/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── main.py              # FastAPI app
│   ├── requirements.txt
│   └── app/
│       ├── models.py        # SQLAlchemy models
│       ├── schemas.py       # Pydantic schemas
│       ├── routers/         # auth, qcm, sessions, users
│       └── db.py            # SQLite connection
├── frontend/
│   ├── Dockerfile           # Nginx
│   ├── nginx.conf
│   └── dist/                # HTML/CSS/JS buildés
└── data/
    ├── db/
    │   └── qcm.db           # SQLite (persisté via volume)
    └── images/              # Images uploadées (persisté via volume)
```

### 13.2 Variables d'environnement backend

| Variable | Description | Exemple |
|---|---|---|
| `SECRET_KEY` | Clé JWT | chaîne aléatoire 64 chars |
| `DATABASE_URL` | Chemin SQLite | `sqlite:///./db/qcm.db` |
| `ALLOWED_ORIGINS` | CORS origins | `https://mondomaine.com` |
| `UPLOAD_DIR` | Dossier images | `/app/static/images` |

### 13.3 Nginx config (résumé)

```nginx
server {
    listen 80;
    server_name mondomaine.com;

    location /api/ {
        proxy_pass http://backend:8000/api/;
    }

    location /ws/ {
        proxy_pass http://backend:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 16. Stack technique

| Couche | Choix | Justification |
|---|---|---|
| Frontend | HTML5 + Vanilla JS ES2020 | Zéro dépendance, rapide |
| Backend | Python 3.12 + FastAPI | Typage fort, auto-doc, performant |
| ORM | SQLAlchemy 2.x | Compatible SQLite, migrations Alembic |
| Base de données | SQLite | Zéro serveur, volume Docker suffisant |
| Auth | JWT (python-jose) + bcrypt | Standard, stateless |
| QR code | lib `qrcode` (Python) | Simple, génération serveur |
| Serveur WSGI | Uvicorn | Async, recommandé FastAPI |
| Reverse proxy | Nginx | Sert static + proxy API |
| Conteneurisation | Docker + docker-compose | Déploiement reproductible VPS |

---

## 17. Critères d'acceptance

### Auth et inscription

- [ ] Login valide → JWT retourné et stocké
- [ ] Login invalide → HTTP 401, message erreur
- [ ] JWT expiré → redirect login automatique
- [ ] Route protégée sans token → HTTP 401
- [ ] Inscription → `avatar_id` assigné aléatoirement entre 1 et 80
- [ ] Pseudo affiché = `"Lord " + prénom` dans toutes les vues publiques
- [ ] Email et nom réel non visibles d'un autre apprenant via l'API
- [ ] `GET /api/sessions/{id}/leaderboard` ne retourne jamais `email` ni `nom`

### Avatar

- [ ] 80 fichiers avatar présents dans `frontend/dist/avatars/avatar_01.svg` à `avatar_80.svg`
- [ ] Avatar affiché sur écran principal, mobile JoinView et leaderboard
- [ ] Avatar non modifiable par l'apprenant (assigné à l'inscription, immuable)

### Création QCM

- [ ] Créer QCM avec question de chaque type
- [ ] Ajouter image à énoncé et à proposition via upload
- [ ] Modifier/supprimer QCM

### Session & QR

- [ ] Créer session → `qr_token` généré
- [ ] GET `/api/sessions/{id}/qr` → PNG QR code retourné
- [ ] Scan QR → redirect login si non connecté
- [ ] Scan QR → affiche question courante si connecté
- [ ] "Question suivante" → vue mobile mise à jour (polling ou WS)
- [ ] Scan QR après session terminée → message clair

### Réponses

- [ ] Soumettre réponse → enregistrée en base
- [ ] Double soumission même question → HTTP 409
- [ ] Score calculé correctement (choix unique, multiple, vrai/faux)

### Leaderboard

- [ ] Fin session → leaderboard affiché automatiquement
- [ ] Top 3 → podium avec médailles 🥇🥈🥉 + avatar large
- [ ] Rang 4+ avec score ≥ 50% → zone "challengers"
- [ ] Score < 50% → zone "en dehors du podium", avatar grisé
- [ ] Égalité → départagé par rapidité de réponse
- [ ] Leaderboard visible sur écran principal ET mobile apprenant
- [ ] Admin peut masquer la zone "en dehors" (toggle)
- [ ] Données leaderboard n'exposent jamais email ni nom réel

### Déploiement

- [ ] `docker-compose up` démarre backend + frontend
- [ ] SQLite persisté après redémarrage conteneur
- [ ] Images uploadées persistées après redémarrage

---

## 18. Historique des versions

| Version | Date | Modifications |
|---|---|---|
| 1.0 | 2026-05-12 | Version initiale (JSON local, pas de backend) |
| 1.1 | 2026-05-12 | Ajout support images (énoncé + propositions) |
| 2.0 | 2026-05-12 | Refonte complète : FastAPI + SQLite + Docker VPS + QR code + session interactive |
| 2.1 | 2026-05-12 | Avatars cuisine (80), pseudo "Lord X", protection données, leaderboard podium + seuil 50% |
| 2.2 | 2026-06-15 | Bugs critiques corrigés sur qcm-v2 (React+Firebase) : BUG-07 écran blanc useState manquant, BUG-08 score dénominateur incorrect |

*Document rédigé le 2026-05-12 — mis à jour 2026-06-15.*

---

## 19. Implémentation actuelle — qcm-v2

> Stack réelle déployée, différente de l'architecture cible (§3 / §16).

| Couche | Implémentation réelle |
|--------|----------------------|
| Frontend | React 19 + Vite, déployé GitHub Pages |
| Backend / DB | Firebase Firestore (onSnapshot temps réel) |
| Auth | Firebase Anonymous Auth (UID par sessionStorage pour multi-onglet) |
| Images | Cloudinary |
| CI/CD | GitHub Actions → GitHub Pages (~20s build) |
| URL prod | https://pierrre2db.github.io/qcm-v2/ |
| Repo | https://github.com/pierrre2db/qcm-v2 |

### 19.1 Bugs critiques corrigés (2026-06-15)

**BUG-07 — Écran blanc après fin session live**

- **Symptôme :** élève voit page blanche après fin session (ScreenSessionEnd → rien)
- **Root cause :** `setQuestionsJouees(jouees)` et `questionsJouees` utilisés dans `App.jsx` sans déclaration `useState` → `ReferenceError` → crash arbre React
- **Fix — `src/App.jsx` ligne 79 :**
```js
const [questionsJouees, setQuestionsJouees] = useState(null)
```
- **Commit :** `a583be77` — *fix: add missing questionsJouees useState declaration in App.jsx*
- **Vérifié :** session YKUK74 (2026-06-15) — ScreenResult affiché correctement

**BUG-08 — Score dénominateur incorrect (ex: `/6` pour quiz 5 questions)**

- **Symptôme :** ScreenResult affiche `0 / 6` au lieu de `0 / 5`
- **Root cause :** `questionCourante = 5` dans Firestore à termination (post-incrémenté après dernière question) → `Math.max(1, 5+1) = 6`
- **Fix — `src/App.jsx` ligne 152 :**
```js
// Avant
const jouees = Math.max(1, (live.salon.questionCourante ?? 0) + 1)

// Après
const jouees = Math.min(
  Math.max(1, (live.salon.questionCourante ?? 0) + 1),
  live.salon.totalQuestions ?? questions.length
)
```
- **Commit :** `cc6407b8` — *fix: cap questionsJouees to totalQuestions to avoid /6 on 5Q quiz*
- **Vérifié :** session 57E3CB (2026-06-15) — score `0 / 5` confirmé
