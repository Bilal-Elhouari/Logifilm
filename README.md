# Logifilm - Crew Management Software

Application de gestion d'équipe pour les productions audiovisuelles.

## 📥 Installation

### Windows
1. Téléchargez le fichier `.exe` depuis la page [Releases](https://github.com/Bilal-Elhouari/Logifilm-releases/releases)
2. Double-cliquez sur le fichier pour installer l'application
3. L'application est prête à utiliser !

### macOS

1. Téléchargez le fichier `.dmg` depuis la page [Releases](https://github.com/Bilal-Elhouari/Logifilm-releases/releases)
2. Ouvrez le fichier `.dmg`
3. Glissez l'application **Logifilm** dans le dossier **Applications**

#### ⚠️ Message "L'application est endommagée" ?

Si vous voyez ce message : *« Logifilm est endommagé et ne peut pas être ouvert »*, **l'application n'est pas réellement endommagée**. C'est une mesure de sécurité de macOS pour les applications téléchargées depuis Internet.

**Pour résoudre ce problème, suivez ces étapes :**

1. Ouvrez le **Terminal** (cherchez "Terminal" dans Spotlight avec `Cmd + Espace`)
2. Copiez et collez cette commande :

```bash
xattr -cr /Applications/Logifilm.app
```

3. Appuyez sur **Entrée**
4. Vous pouvez maintenant ouvrir l'application normalement !

> **Note :** Si vous avez placé l'application ailleurs que dans le dossier Applications, remplacez `/Applications/Logifilm.app` par le chemin où se trouve l'application.

---

## 🚀 Fonctionnalités

- Gestion des équipes de production
- Suivi des contrats et documents
- Planning et organisation
- Export de documents

## 🛠️ Développement

### Prérequis
- Node.js 18+
- npm ou yarn

### Installation des dépendances
```bash
npm install
```

### Lancer en mode développement
```bash
npm run dev
```

### Créer un build
```bash
npm run build
```

## 📄 Licence

© 2024 Logifilm - Tous droits réservés
