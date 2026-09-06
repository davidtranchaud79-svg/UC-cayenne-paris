# Logiciel Présences, Engagements et Excuses - Cayenne

Ce pack contient une base Google Sheets + Apps Script pour suivre les présences sur l'année :

- formulaire public séparé pour les sociétaires, aspirants et compagnons ;
- excuses possibles en avance sur plusieurs dates ;
- disponibilités pour aider sur les événements ;
- base d’événements types pour créer un calendrier sans repartir de zéro ;
- génération d'une feuille `CR_...` par événement ;
- suivi annuel par personne ;
- dashboard admin séparé, relié au Google Sheet et protégé par code ;
- export PDF d'une feuille événement pour l'intégrer au compte rendu.

## Liens directs

| Élément | Lien |
|---|---|
| Formulaire public | [Ouvrir le formulaire](https://script.google.com/macros/s/AKfycbwKD8Z_kgeNQmDqPgpKT4QtHyQ9O0ZhQbaYJla5QsKdt8VkZmW9_QRU1A6WwhXuBI7HIQ/exec) |
| Dashboard admin | [Ouvrir le dashboard](https://script.google.com/macros/s/AKfycbwKD8Z_kgeNQmDqPgpKT4QtHyQ9O0ZhQbaYJla5QsKdt8VkZmW9_QRU1A6WwhXuBI7HIQ/exec?page=admin) |
| Google Sheet de suivi | [Ouvrir le Sheet](https://docs.google.com/spreadsheets/d/1_atXm_AKfq2864aCabWhcyFerbix0xFPh2VUUC_pPs4/edit) |
| Page GitHub | [Ouvrir la page](https://davidtranchaud79-svg.github.io/UC-cayenne-paris/) |
| Dépôt GitHub | [Voir le code](https://github.com/davidtranchaud79-svg/UC-cayenne-paris) |

Important : GitHub sert à stocker le code et la notice. Le formulaire public et le dashboard admin sont déployés dans Google Apps Script, car le code utilise `google.script.run`.

## Branchement Sheet et GitHub

Le fichier `.clasp.json.example` prépare le lien entre le dépôt GitHub et le projet Apps Script attaché au Sheet. Il faut récupérer l'ID du script dans `Extensions > Apps Script > Paramètres du projet`, puis créer un fichier local `.clasp.json`.

La procédure détaillée est dans [`docs/BRANCHER_SHEET_GITHUB.md`](docs/BRANCHER_SHEET_GITHUB.md).

## Fichiers

| Fichier | Utilité |
|---|---|
| `index.html` | Page d'accueil GitHub avec liens vers le Sheet et les sources |
| `.clasp.json.example` | Modèle de liaison GitHub / Apps Script |
| `.github/workflows/deploy-apps-script.yml` | Déploiement manuel vers Apps Script avec secrets GitHub |
| `docs/BRANCHER_SHEET_GITHUB.md` | Notice détaillée de branchement |
| `Modele_Presences_Engagements_Cayenne.xlsx` | Modèle de classeur à importer dans Google Sheets |
| `src/Code.gs` | Code serveur Apps Script |
| `src/Index.html` | Petite page routeur avec les deux accès |
| `src/Public.html` | Formulaire public membres |
| `src/Admin.html` | Dashboard bureau |
| `src/appsscript.json` | Manifest Apps Script pour déploiement propre |

## GitHub

Le dépôt peut être poussé tel quel sur GitHub. Les fichiers temporaires, aperçus et archives ZIP sont exclus par `.gitignore`.

Structure conseillée :

- `src/Code.gs` : logique Google Sheets, dashboard, génération des feuilles `CR_...` ;
- `src/Index.html` : page routeur ;
- `src/Public.html` : formulaire public ;
- `src/Admin.html` : dashboard admin ;
- `BASE_EVENEMENTS` : bibliothèque de modèles pour créer rapidement les réunions, fêtes, JEP, cours et travaux UC ;
- `src/appsscript.json` : configuration Apps Script ;
- `outputs/Modele_Presences_Engagements_Cayenne.xlsx` : modèle Excel de départ ;
- `README.md` : notice d'installation.

## Mise en place

1. Ouvrir le Google Sheet modèle.
2. Aller dans `Extensions > Apps Script`.
3. Créer ou remplacer le fichier `Code.gs` avec le contenu de `src/Code.gs`.
4. Créer trois fichiers HTML nommés `Index`, `Public` et `Admin`.
5. Coller les contenus de `src/Index.html`, `src/Public.html` et `src/Admin.html` dans les fichiers correspondants.
6. Vérifier le fichier `appsscript.json` ou recopier les autorisations depuis `src/appsscript.json`.
7. Dans Apps Script, lancer la fonction `setupSystem`.
8. Retourner dans le Sheet et compléter `MEMBRES`. Pour les événements, utiliser l’admin ou l’onglet `BASE_EVENEMENTS`.
9. Dans Apps Script, cliquer sur `Déployer > Nouveau déploiement > Application Web`.
10. Choisir :
   - Exécuter en tant que : `Moi`
   - Accès : selon votre choix, par exemple les personnes disposant du lien
11. Liens Web App actuels :
    - Public : https://script.google.com/macros/s/AKfycbwKD8Z_kgeNQmDqPgpKT4QtHyQ9O0ZhQbaYJla5QsKdt8VkZmW9_QRU1A6WwhXuBI7HIQ/exec
    - Admin : https://script.google.com/macros/s/AKfycbwKD8Z_kgeNQmDqPgpKT4QtHyQ9O0ZhQbaYJla5QsKdt8VkZmW9_QRU1A6WwhXuBI7HIQ/exec?page=admin

## Utilisation bureau

Depuis le Google Sheet, le menu `Présences UC` permet de :

- installer ou réparer le classeur ;
- actualiser le dashboard ;
- générer les feuilles événement ;
- exporter la feuille active en PDF.

Le code admin par défaut est `1234`. Il se modifie dans l'onglet `PARAMETRES`, ligne `admin_pin`.

## Base d’événements

L’onglet `BASE_EVENEMENTS` contient les modèles réutilisables : réunion des jeunes, réunion compagnon, cours en Cayenne, fête de juin, fête de novembre, JEP, assemblée générale et travail UC.

Dans le dashboard admin, choisir un modèle, renseigner la date, ajuster le titre ou le lieu si besoin, puis cliquer sur `Ajouter au calendrier`.

## Logique de suivi

Toutes les réponses arrivent dans `REPONSES`.  
Les feuilles `CR_...` sont générées automatiquement depuis `REPONSES`.  
Le suivi annuel et le dashboard sont recalculés depuis les mêmes données.

Le bureau garde donc une source unique et évite les copies manuelles.
