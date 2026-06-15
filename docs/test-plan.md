# Test Plan — qcm-v2
**Version :** 0.2  
**Date :** 2026-06-15  
**Env :** https://pierrre2db.github.io/qcm-v2/ (GitHub Pages, Firebase Firestore)  
**Statut :** Living document — compléter après chaque session de test

---

## 1. Périmètre

| Module | Inclus | Exclu |
|--------|--------|-------|
| Solo (Entraînement) | ✅ | — |
| Session live multi-joueur | ✅ | — |
| Dashboard prof (ScreenDashboard) | ✅ | — |
| Podium / résultats fin de session | ✅ | — |
| Administration (gestion quiz) | ✅ | — |
| Responsive mobile | ✅ (Android + iOS) | Tablette |
| Multi-onglet même navigateur | ✅ | — |
| Perf / charge | ❌ hors scope v0.1 | |

---

## 2. Environnements de test

| Rôle | Device simulé | Onglet | Notes |
|------|--------------|--------|-------|
| Professeur | PC Chrome | Tab A | Full-width |
| Élève 1 (agent) | PC Chrome | Tab B | sessionStorage UUID distinct |
| Élève 2 (Android) | PC Chrome étroit ~740px | Tab C | Extension panel réduit viewport |
| Élève 3 (iOS) | PC Chrome | Tab D | |

**Setup avant chaque session :**
1. Recharger Tab A (prof) avec `location.reload(true)` pour vider cache GitHub Pages
2. Naviguer Tab B/C/D vers `/?room=CODE` après création session
3. Vérifier header élève = nom du bon quiz avant lancement

---

## 3. Cas de test — Solo (Entraînement)

| ID | Description | Étapes | Résultat attendu | Statut |
|----|-------------|--------|-----------------|--------|
| S-01 | Sélectionner un quiz | Cliquer un quiz dans la liste | Quiz mis en surbrillance | ✅ OK |
| S-02 | Démarrer entraînement | Cliquer "Commencer l'entraînement" | Q1 affichée, timer démarre | — |
| S-03 | Répondre correctement | Cliquer bonne réponse | Feedback vert, score +1 | — |
| S-04 | Répondre incorrectement | Cliquer mauvaise réponse | Feedback rouge, bonne réponse révélée | — |
| S-05 | Timer expire | Laisser timer à 0 | Auto-passe à question suivante | — |
| S-06 | Fin de quiz | Répondre toutes les questions | ScreenResult affiche score X/10 | — |
| S-07 | Score enregistré leaderboard | Terminer quiz | Entrée visible dans "Derniers exploits" | — |
| S-08 | Rejouer | Cliquer rejouer depuis résultats | Retour Q1, nouveau score | — |

---

## 4. Cas de test — Création session live

| ID | Description | Étapes | Résultat attendu | Statut |
|----|-------------|--------|-----------------|--------|
| L-01 | Sélectionner quiz live | Cliquer quiz dans "Projeter le Dashboard" | Quiz mis en surbrillance | ✅ OK |
| L-02 | Créer session | Cliquer "Créer une session live" | Code 6 car. + QR code affiché | ✅ OK |
| L-03 | **Header prof = quiz sélectionné** | Après création | Header = nom quiz live (pas le quiz par défaut) | ✅ OK (fix f48975a7) |
| L-04 | Rejoindre avec code | Élève saisit code → "Rejoindre" | Élève voit "En attente du lancement", son avatar affiché côté prof | ✅ OK |
| L-05 | Rejoindre via URL directe | Naviguer vers `/?room=CODE` | Formulaire pré-rempli avec CODE | ✅ OK |
| L-06 | Rejoindre via QR code | Scanner QR | Même que L-05 | — |
| L-07 | **Header élève = quiz sélectionné** | Après join | Header élève = nom quiz live | ✅ OK |
| L-08 | Multi-élèves | 3 élèves rejoignent | Tous visibles dans "Joueurs connectés", compteur correct | ✅ OK |
| L-09 | Collision UUID multi-onglet | 2 onglets même navigateur rejoignent | 2 joueurs distincts dans Firestore | ✅ OK (fix sessionStorage) |

---

## 5. Cas de test — Session live en cours

| ID | Description | Étapes | Résultat attendu | Statut |
|----|-------------|--------|-----------------|--------|
| L-10 | Lancement partie | Prof clique "Lancer la partie" | Tous les élèves passent en mode question | ✅ OK |
| L-11 | **Questions prof = quiz live** | Observer ScreenDashboard Q1 | Question = celle du quiz sélectionné (pas quiz par défaut) | ✅ OK (fix f48975a7) |
| L-12 | Questions élèves = quiz live | Observer écran élève Q1 | Même question que prof | ✅ OK |
| L-13 | Réponse élève visible prof | Élève répond | Compteur "Répondu X/N" s'incrémente | ✅ OK |
| L-14 | Bonne réponse élève | Élève clique bonne réponse | Feedback vert côté élève | ✅ OK |
| L-15 | Mauvaise réponse élève | Élève clique mauvaise réponse | Feedback rouge côté élève | ✅ OK |
| L-16 | Timer question | Observer timer | Décompte visible, expire proprement | ✅ OK |
| L-17 | Question suivante (prof) | Prof clique "Question suivante" | Tous les élèves passent à Q+1 | ✅ OK |
| L-18 | Progression 10/10 | Avancer jusqu'à Q10 | Toutes questions affichées correctement | ✅ OK |
| L-19 | Réponse mobile (viewport étroit) | Élève sur tab ~740px | Formulaire et bouton "Rejoindre" visibles (scroll si besoin) | ✅ OK |
| L-20 | Élève déconnecté reconnecte | Recharger tab élève | Élève retrouve la bonne question en cours | — |

---

## 6. Cas de test — Fin de session

| ID | Description | Étapes | Résultat attendu | Statut |
|----|-------------|--------|-----------------|--------|
| F-01 | ScreenSessionEnd | Prof clique "Arrêter" ou dernière question terminée | Écran rouge splash + countdown affiché côté élève (pas d'écran blanc) | ✅ OK (fix BUG-07) |
| F-02 | ScreenResult | Après countdown | Score personnel X/N, feedback "EXPERT/AMÉLIORABLE/INSUFFISANT" — dénominateur = nb questions réelles | ✅ OK (fix BUG-07 + BUG-08) |
| F-03 | ScreenPodium | Après ScreenResult | Classement joueurs avec pts + temps | ✅ OK |
| F-04 | Score /N correct | Observer dénominateur score | Score sur N = nb questions du quiz (ex: 0/5 pour Debug 5Q) | ✅ OK (fix cc6407b8) |
| F-05 | Retour accueil après podium | Cliquer retour | Retour à l'écran d'accueil | — |

---

## 7. Cas de test — Administration

| ID | Description | Étapes | Résultat attendu | Statut |
|----|-------------|--------|-----------------|--------|
| A-01 | Accéder à l'admin | Cliquer "Administration" | Interface de gestion des quiz | — |
| A-02 | Lister les quiz | Page admin chargée | Tous les quiz visibles avec nb questions | — |
| A-03 | Créer quiz | Remplir formulaire → Valider | Quiz apparaît dans la liste | — |
| A-04 | Modifier quiz | Éditer quiz existant | Modifications persistées | — |
| A-05 | Supprimer quiz | Supprimer quiz | Quiz retiré de la liste | — |

---

## 8. Bugs connus

| ID | Sévérité | Description | Root cause | Fix | Statut |
|----|----------|-------------|-----------|-----|--------|
| BUG-01 | 🔴 CRITIQUE | Teacher ScreenDashboard montrait mauvais quiz | `handleCreateSession` ne chargeait pas le quiz live dans `quizData` | Commit `f48975a7` : appel `chargerQuizParId` + `setQuizData` après `creerSalon` | ✅ Fixé |
| BUG-02 | 🔴 CRITIQUE | Collision joueurs multi-onglet même navigateur | Firebase `signInAnonymously` retournait même UID par onglet | Remplacement par UUID `sessionStorage` par onglet | ✅ Fixé |
| BUG-03 | 🟡 MOYEN | `ReferenceError: Md is not defined` dans ScreenDashboard | Import manquant | Import ajouté | ✅ Fixé |
| BUG-04 | 🟡 MOYEN | Score affiché `/11` au lieu de `/10` dans ScreenResult | À investiguer (comptage questions ?) | — | ✅ Résolu par BUG-07 |
| BUG-05 | 🟢 MINEUR | `DUREE_QUESTION = 30s` vs SPECS 60s | Constante non alignée avec spec | Modifier constante | 🔍 À décider |
| BUG-06 | 🟢 MINEUR | Bouton "Rejoindre" hors viewport sur mobile étroit | Layout non scrollable sur small viewport | Scroll manuel workaround | 🔍 À investiguer |
| BUG-07 | 🔴 CRITIQUE | Écran blanc (white screen) côté élève après fin session live | `setQuestionsJouees` utilisé sans déclaration `useState` → `ReferenceError` → crash React | Ajout `const [questionsJouees, setQuestionsJouees] = useState(null)` ligne 79 App.jsx | ✅ Fixé — commit `a583be77` |
| BUG-08 | 🟡 MOYEN | Score affiché `/6` pour quiz 5 questions dans ScreenResult | `questionCourante = 5` à termination → `Math.max(1, 5+1) = 6` dépassait `totalQuestions` | `Math.min(Math.max(1, questionCourante+1), totalQuestions)` | ✅ Fixé — commit `cc6407b8` |

---

## 9. Matrice de régression prioritaire

Tests à relancer impérativement après chaque déploiement :

```
L-03  Header prof = quiz sélectionné
L-07  Header élève = quiz sélectionné
L-09  Collision UUID multi-onglet
L-11  Questions prof = quiz live
L-12  Questions élèves = quiz live
L-17  Question suivante (prof → tous élèves)
F-01  ScreenSessionEnd
F-02  ScreenResult
F-03  ScreenPodium
```

---

## 10. Procédure E2E complète (smoke test)

```
1. Prof : sélectionner "Réglementation en sandwicherie" → Créer session live
   → Vérifier : header prof = "Réglementation en sandwicherie"
   → Vérifier : code 6 caractères affiché

2. Élève 1 (Tab B) : rejoindre CODE → pseudo "Sultane"
   → Vérifier : header élève = "Réglementation en sandwicherie"
   → Vérifier : "1 joueur connecté" côté prof

3. Élève 2 (Tab C, étroit) : rejoindre même CODE → pseudo "Android"
   → Vérifier : 2 joueurs distincts côté prof

4. Prof : cliquer "Lancer la partie"
   → Vérifier : tous les élèves passent à Q1
   → Vérifier : Q1 prof = Q1 élèves (même texte)

5. Élèves : répondre Q1 à Q10 (mélange correct/incorrect)
   → Prof avance via "Question suivante" à chaque fois
   → Vérifier : compteur "Répondu X/N" s'update

6. Fin Q10 : Prof arrête session
   → Vérifier : ScreenSessionEnd (red splash + countdown) côté élèves
   → Vérifier : ScreenResult (score X/10, feedback groupe)
   → Vérifier : ScreenPodium (classement avec pts + temps)

✅ PASS = aucune divergence prof/élève, tous les écrans affichés
```

---

## 11. Historique des sessions de test

| Date | Session | Participants | Résultat | Notes |
|------|---------|-------------|---------|-------|
| 2026-06-14 | GFCSLC | Emile + Sophie | Partiel — interrompu à Q4/10 | Découverte bug UUID |
| 2026-06-14 | WZXAQP | Sultane + Eleve_Android + Eleve_iOS | ✅ Complet 10/10 | Découverte bug quiz mismatch |
| 2026-06-14 | VSBPLD | Sultane | ✅ Fix vérifié | Confirmation fix BUG-01 |
| 2026-06-15 | YKUK74 | Eleve_A + Eleve_B (simulés) | ✅ Complet 5/5 — white screen reproduit et fixé | Découverte + fix BUG-07 (useState manquant) |
| 2026-06-15 | 57E3CB | Eleve_A + Eleve_B (simulés) | ✅ Complet 5/5 — score /5 confirmé | Confirmation fix BUG-08 (Math.min cap totalQuestions) |

---

## 12. Roadmap tests à écrire

- [ ] Tests automatisés Playwright pour smoke test E2E
- [ ] Test charge : 10+ élèves simultanés
- [ ] Test réseau dégradé (perte de connexion élève en cours de session)
- [ ] Test F-04 : score /11 → isoler la source du bug
- [ ] Test responsive : vrai mobile (DevTools device emulation)
- [ ] Test admin CRUD complet (A-01 à A-05)
