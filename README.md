# Logiciel Présences, Engagements et Excuses - Cayenne

Ce pack contient une base Google Sheets + Apps Script pour suivre les présences sur l'année :

- espace personnel avec code individuel pour les sociétaires, aspirants et compagnons ;
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
| Formulaire public | [Ouvrir le formulaire](https://script.google.com/macros/s/AKfycbz_Ra9SNbvvkexqeNds_ndM_NWERyxSOnO9ug4jX-UFGC4ebrHylPbwPpMRY-Z0nmu3eA/exec) |
| Dashboard admin | [Ouvrir le dashboard](https://script.google.com/macros/s/AKfycbz_Ra9SNbvvkexqeNds_ndM_NWERyxSOnO9ug4jX-UFGC4ebrHylPbwPpMRY-Z0nmu3eA/exec?page=admin) |
| Google Sheet de suivi | [Ouvrir le Sheet](https://docs.google.com/spreadsheets/d/1_atXm_AKfq2864aCabWhcyFerbix0xFPh2VUUC_pPs4/edit) |
| Page GitHub | [Ouvrir la page](https://davidtranchaud79-svg.github.io/UC-cayenne-paris/) |
| Dépôt GitHub | [Voir le code](https://github.com/davidtranchaud79-svg/UC-cayenne-paris) |

Important : GitHub sert à stocker le code et la notice. Le formulaire public et le dashboard admin sont déployés dans Google Apps Script, car le code utilise `google.script.run`.

La publication automatique est suspendue : le 19 septembre 2026, une mise à jour via l’API Google a rendu les deux espaces inaccessibles (HTTP 403), malgré des réglages publics identiques. Le retour à la version 17 n’a pas levé ce refus. GitHub synchronise désormais les sources et lance les tests ; le propriétaire valide la publication dans **Déployer > Gérer les déploiements > Modifier > Nouvelle version > Déployer**, en conservant le déploiement existant.

## Branchement Sheet et GitHub

Le fichier `.clasp.json.example` prépare le lien entre le dépôt GitHub et le projet Apps Script attaché au Sheet. Il faut récupérer l'ID du script dans `Extensions > Apps Script > Paramètres du projet`, puis créer un fichier local `.clasp.json`.

La procédure détaillée est dans [`docs/BRANCHER_SHEET_GITHUB.md`](docs/BRANCHER_SHEET_GITHUB.md).

## Fichiers

| Fichier | Utilité |
|---|---|
| `index.html` | Page d’accueil aux couleurs de la Cayenne avec accès membres et bureau |
| `.clasp.json.example` | Modèle de liaison GitHub / Apps Script |
| `.github/workflows/deploy-apps-script.yml` | Tests puis synchronisation des sources vers Apps Script |
| `docs/BRANCHER_SHEET_GITHUB.md` | Notice détaillée de branchement |
| `Modele_Presences_Engagements_Cayenne.xlsx` | Modèle de classeur à importer dans Google Sheets |
| `src/Code.gs` | Code serveur Apps Script |
| `src/Access.gs` | Codes personnels, sessions et contrôle des accès |
| `src/Index.html` | Petite page routeur avec les deux accès |
| `src/Public.html` | Formulaire public membres |
| `src/Admin.html` | Dashboard bureau |
| `src/Styles.html` | Styles partagés et adaptation mobile |
| `src/Ui.html` | Icônes et fonctions de présentation |
| `src/Brand.html` | Écusson de la Cayenne de Paris |
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
3. Créer ou remplacer les fichiers `Code.gs` et `Access.gs` avec les contenus de `src/Code.gs` et `src/Access.gs`.
4. Créer six fichiers HTML nommés `Index`, `Public`, `Admin`, `Styles`, `Ui` et `Brand`.
5. Coller chaque contenu `src/*.html` dans le fichier correspondant. Les onglets `INDEX_HTML`, `PUBLIC_HTML`, `ADMIN_HTML`, `STYLES_HTML`, `UI_HTML` et `BRAND_HTML` du Sheet contiennent aussi les copies du code.
6. Vérifier le fichier `appsscript.json` ou recopier les autorisations depuis `src/appsscript.json`.
7. Pour un nouveau classeur uniquement, lancer la fonction `setupSystem_` depuis l’éditeur Apps Script.
8. Retourner dans le Sheet et compléter `MEMBRES`. Pour les événements, utiliser l’admin ou l’onglet `BASE_EVENEMENTS`.
9. Dans Apps Script, cliquer sur `Déployer > Nouveau déploiement > Application Web`.
10. Choisir :
   - Exécuter en tant que : `Moi`
   - Accès : selon votre choix, par exemple les personnes disposant du lien
11. Liens Web App actuels :
    - Public : https://script.google.com/macros/s/AKfycbz_Ra9SNbvvkexqeNds_ndM_NWERyxSOnO9ug4jX-UFGC4ebrHylPbwPpMRY-Z0nmu3eA/exec
    - Admin : https://script.google.com/macros/s/AKfycbz_Ra9SNbvvkexqeNds_ndM_NWERyxSOnO9ug4jX-UFGC4ebrHylPbwPpMRY-Z0nmu3eA/exec?page=admin

## Utilisation bureau

Depuis le Google Sheet, le menu `Présences UC` permet de :

- installer ou réparer le classeur ;
- actualiser le dashboard ;
- générer les feuilles événement ;
- exporter la feuille active en PDF.

Le code commun du bureau est celui de `PARAMETRES`, ligne `admin_pin`. Le code existant est conservé. Il peut être changé dans **Réglages > Code commun du bureau** (8 caractères minimum).

### Espaces personnels

1. Ouvrir l’espace bureau avec le code commun, puis **Membres > Accès personnels**.
2. Pour un membre déjà présent dans le Sheet, choisir **Créer le code**. Sinon, utiliser **Ajouter un membre**.
3. Transmettre au membre son code et le lien de l’espace membres. Aucun message n’est envoyé automatiquement.
4. Le membre entre son code et retrouve son identité, ses réponses et les événements. Il peut modifier une réponse depuis **Mes réponses enregistrées** ou préparer plusieurs dates.
5. **Remplacer le code** invalide l’ancien code et les sessions en cours. **Désactiver** retire l’accès sans effacer les réponses.

Les codes personnels sont affichés une seule fois et conservés sous forme d’empreintes dans les propriétés du script, pas dans le Sheet ni dans GitHub. Les sessions membres durent au maximum quatre heures ; la déconnexion les invalide. Les espaces membres et bureau utilisent des sessions distinctes, contrôlées côté serveur à chaque appel. Le code commun du bureau reste dans le Sheet, dont l’accès doit rester réservé au bureau.

L’identité d’un compte est rattachée à la ligne MEMBRES par son email, ou à défaut par nom et prénom. Ne changez pas ces champs directement sans recréer l’accès ; les doublons de même identité sont refusés à la connexion. Les fonctions de maintenance terminées par `_` sont exécutables depuis le menu du classeur ou l’éditeur, pas depuis une page membre.

### Enregistrement et comptes rendus

La liaison vers une feuille CR met à jour uniquement la colonne `Feuille_CR`. Elle conserve les en-têtes historiques en ligne 3 et les validations des réponses : correction de l’erreur « M3 : Sociétaire, Aspirant, Compagnon ». Une relance de la même soumission ne crée pas de doublon. Si les réponses sont enregistrées mais qu’une feuille de synthèse échoue, l’application confirme l’enregistrement avec un avertissement.

## Base d’événements

L’onglet `BASE_EVENEMENTS` contient les modèles réutilisables : réunion des jeunes, réunion compagnon, cours en Cayenne, fête de juin, fête de novembre, JEP, assemblée générale et travail UC.

Dans le dashboard admin, choisir un modèle, renseigner la date, ajuster le titre ou le lieu si besoin, puis cliquer sur `Ajouter au calendrier`.

## Logique de suivi

Toutes les réponses arrivent dans `REPONSES`.  
Les feuilles `CR_...` sont générées automatiquement depuis `REPONSES`.  
Le suivi annuel et le dashboard sont recalculés depuis les mêmes données.

Le bureau garde donc une source unique et évite les copies manuelles.

## Interface et vérification

L’identité graphique et la source de l’écusson sont décrites dans [`docs/IDENTITE_VISUELLE.md`](docs/IDENTITE_VISUELLE.md). Les styles sont partagés par les espaces membres et bureau ; le tableau des membres devient une liste de fiches sur téléphone.

`npm ci` puis `npm test` vérifient les interactions des interfaces avec un serveur simulé et la validation des déploiements. Ces tests n’envoient aucune réponse dans le classeur réel.
