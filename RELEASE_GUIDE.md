# Installation et mises a jour de Logifilm

Logifilm utilise GitHub Releases pour distribuer les installateurs et les mises
a jour. Une version officielle cree :

- un installateur `.exe` pour Windows ;
- un fichier `.dmg` et une archive de mise a jour `.zip` pour macOS ;
- les fichiers de metadonnees utilises par l'application pour detecter une
  nouvelle version.

## Publier une nouvelle version

Le numero du tag doit toujours correspondre au numero de `package.json`.

```powershell
git add .
git commit -m "Description des modifications"
npm version patch
git push --follow-tags origin main
```

`npm version patch` passe par exemple de `1.0.2` a `1.0.3`, cree le commit et
le tag `v1.0.3`. La derniere commande pousse le code et le tag, puis declenche
`.github/workflows/release.yml`.

Quand le workflow est termine, les installateurs sont disponibles dans :

`https://github.com/Bilal-Elhouari/Logifilm-releases/releases` (page publique pour les clients, sans code source).
Une copie est aussi gardée dans les releases du dépôt de code privé.

Tant que cette page ne contient aucune release publiee avec les fichiers
`latest.yml`, `.exe` et `.blockmap`, l'application affichera simplement
`Aucune mise a jour publiee pour le moment`.

## Fonctionnement pour les utilisateurs

1. L'utilisateur installe Logifilm depuis la page Releases.
2. Au demarrage, l'application verifie silencieusement si une version plus
   recente existe.
3. Le bouton `Mise a jour` permet de verifier, telecharger puis installer la
   nouvelle version.
4. Aucun telechargement ne commence sans action de l'utilisateur.
5. Windows telecharge son paquet NSIS `.exe`, redemarre puis applique la mise a
   jour automatiquement.
6. macOS non signe detecte la nouvelle version, choisit le `.dmg` compatible,
   ouvre son telechargement puis guide l'utilisateur pour remplacer Logifilm
   dans Applications.
7. Chaque OS affiche son propre theme dans le panneau de mise a jour.

## Points importants

- Le depot GitHub doit etre public pour que les applications installees puissent
  verifier les releases sans jeton secret.
- Windows utilise l'installateur NSIS et peut appliquer la mise a jour apres
  redemarrage.
- Sans signature Apple, macOS ne permet pas a Logifilm de se remplacer
  automatiquement. L'installation du nouveau `.dmg` reste manuelle.
- Pour distribuer une application macOS sans avertissements de securite, une
  signature Apple Developer et une notarisation sont recommandees.
- Ne republiez jamais deux releases avec le meme numero de version.

## Dépôt de code privé, installateurs publics

- `Bilal-Elhouari/Logifilm` : code source, **privé**.
- `Bilal-Elhouari/Logifilm-releases` : installateurs et fichiers de mise à jour, **public**, sans code.
  Les applications installées (v1.0.9 et plus) y cherchent leurs mises à jour.

Publier une version, en deux temps :

1. Pousser le tag (par exemple `v1.0.9`) : `release.yml` compile les installateurs
   et les publie dans les releases du dépôt de code.
2. Quand le workflow est terminé (Mac et Windows), copier la version vers le dépôt public :

   ```bash
   scripts/publish-public-release.sh v1.0.9
   ```

   Le script utilise la connexion GitHub de l'ordinateur (`gh auth login`), aucune clé
   n'est stockée. Il refuse de publier tant qu'un fichier manque (`.exe`, `.dmg`, `.zip`,
   `latest.yml`, `latest-mac.yml`…), pour que les clients ne voient jamais une version
   incomplète.

`build.yml` ne fait qu'un contrôle rapide (types, tests, lint) à chaque push. Pour
compiler les installateurs sans publier : onglet Actions → *Check & Build* → *Run workflow*.
