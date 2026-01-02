# Guide de Mise à Jour et Déploiement

Ce document explique comment publier une nouvelle version de **Logifilm** pour vos utilisateurs.

## 🔄 Comment ça marche ? (Le concept)

Le processus est automatisé grâce à **GitHub Actions**. Voici le cycle de vie d'une mise à jour :

1.  **Vous (Développeur)** : Vous faites vos modifications sur l'interface (code).
2.  **Versioning** : Vous changez le numéro de version dans `package.json` (ex: `1.0.0` ➔ `1.0.1`).
3.  **Déclencheur (Tag)** : Vous créez une "étiquette" (Tag) git (ex: `v1.0.1`) et vous l'envoyez sur GitHub.
4.  **Robot (GitHub Action)** :
    *   GitHub détecte le tag `v*`.
    *   Il lance automatiquement un ordinateur virtuel (Runner).
    *   Il installe votre projet, compile le code (`npm run build:win`).
    *   Il génère les installateurs (`.exe` pour Windows, `.dmg` pour Mac).
    *   **Il crée une "Release" officielle** sur votre page GitHub avec ces fichiers téléchargeables.
5.  **Utilisateur** : Il va sur la page "Releases" de GitHub et télécharge la nouvelle version (ou l'application se met à jour automatiquement si configuré).

---

## 🛠️ Guide Étape par Étape

Voici les commandes exactes à taper pour sortir une mise à jour :

### Étape 1 : Modifier et Tester
Faites vos changements dans le code. Vérifiez que tout marche :
```bash
npm run dev
```

### Étape 2 : Mettre à jour la version
Ouvrez `package.json` et augmentez la version :
```json
{
  "name": "crew-management-software",
  "version": "1.0.1",  <-- Changez ceci
  ...
}
```

### Étape 3 : Commiter la version
Enregistrez ce changement :
```bash
git add package.json
git commit -m "chore: bump version to 1.0.1"
git push
```

### Étape 4 : Créer le Tag (C'est le déclencheur !)
C'est cette étape qui dit à GitHub "Ceci est une version officielle" :
```bash
git tag v1.0.1
git push origin v1.0.1
```

🎉 **C'est tout !**
Allez maintenant dans l'onglet **"Actions"** de votre dépôt GitHub. Vous verrez un workflow démarrer. Quand il finit (environ 5-10 min), la nouvelle version apparaîtra dans la section **"Releases"** (colonne de droite sur la page d'accueil du dépôt).

---

## ⚠️ Configuration Manquante (Important)

Même si vous avez le fichier `.github/workflows/build.yml`, **le système ne marchera pas encore totalement** car il manque deux informations cruciales dans votre `package.json` actuel :

1.  **Repository** : Electron doit savoir *où* publier.
2.  **Publish Config** : Il faut dire à Electron de publier sur GitHub.

**Dois-je ajouter ces configurations pour vous ?** (Voir "Implementation Plan")
