# Brancher le Sheet à GitHub

Le Google Sheet ne se branche pas directement à GitHub. Le bon montage est :

- GitHub garde le code ;
- Apps Script exécute le code ;
- Google Sheet garde les données.

Les données nominatives, les excuses et les motifs d'absence restent dans le Google Sheet. Le dépôt GitHub public ne doit contenir que le code.

## Liens actuels

- Formulaire public : https://script.google.com/macros/s/AKfycbwKD8Z_kgeNQmDqPgpKT4QtHyQ9O0ZhQbaYJla5QsKdt8VkZmW9_QRU1A6WwhXuBI7HIQ/exec
- Dashboard admin : https://script.google.com/macros/s/AKfycbwKD8Z_kgeNQmDqPgpKT4QtHyQ9O0ZhQbaYJla5QsKdt8VkZmW9_QRU1A6WwhXuBI7HIQ/exec?page=admin
- Google Sheet : https://docs.google.com/spreadsheets/d/1_atXm_AKfq2864aCabWhcyFerbix0xFPh2VUUC_pPs4/edit
- Dépôt GitHub : https://github.com/davidtranchaud79-svg/UC-cayenne-paris

## Étape 1 - Récupérer l'ID Apps Script

1. Ouvrir le Google Sheet.
2. Aller dans `Extensions > Apps Script`.
3. Dans Apps Script, ouvrir `Paramètres du projet`.
4. Copier `ID du script`.

## Étape 2 - Créer le fichier `.clasp.json`

À la racine du dépôt, copier `.clasp.json.example` en `.clasp.json`, puis remplacer :

```json
{
  "scriptId": "COLLER_ICI_ID_DU_SCRIPT_APPS_SCRIPT",
  "rootDir": "src"
}
```

par :

```json
{
  "scriptId": "VOTRE_ID_DU_SCRIPT",
  "rootDir": "src"
}
```

## Étape 3 - Activer l'API Apps Script

Dans le compte Google utilisé pour le Sheet, activer l'API Apps Script :

`https://script.google.com/home/usersettings`

## Étape 4 - Envoyer GitHub vers Apps Script

Depuis un ordinateur :

```bash
npm install -g @google/clasp
clasp login
clasp push
```

`clasp push` envoie dans Apps Script :

- `src/Code.gs`
- `src/Index.html`
- `src/Public.html`
- `src/Admin.html`
- `src/appsscript.json`

## Étape 5 - Déployer le formulaire

Dans Apps Script :

1. Lancer `setupSystem`.
2. Accepter les autorisations.
3. Cliquer sur `Déployer > Nouveau déploiement`.
4. Choisir `Application Web`.
5. Choisir `Exécuter en tant que : Moi`.
6. Choisir l'accès souhaité.
7. Copier le lien public du Web App et l'envoyer aux membres.

Le lien public se termine par `/exec`. Le lien admin utilise le même déploiement avec `?page=admin` à la fin.

## Base d’événements

L’onglet `BASE_EVENEMENTS` sert de bibliothèque. Le bureau n’a pas besoin de recréer chaque événement de zéro :

1. ouvrir le dashboard admin ;
2. choisir un modèle ;
3. renseigner la date ;
4. ajuster titre, horaires ou lieu ;
5. ajouter au calendrier.

## Utilisation ensuite

Quand le code change :

```bash
git pull
clasp push
```

Si vous modifiez directement dans Apps Script :

```bash
clasp pull
git add .
git commit -m "Update Apps Script"
git push
```
