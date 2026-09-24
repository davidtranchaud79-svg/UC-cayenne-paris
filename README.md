# Logiciel Présences, Engagements et Excuses - Cayenne

Version **2026.09.23.2** : identifiants stables, événements modifiables et ciblés, traitements en arrière-plan, suivi des mails et comptes rendus sans motifs privés. Voir [les changements et la publication de cette version](docs/MISE_EN_OEUVRE_AUDIT.md).

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
| Formulaire public | [Ouvrir le formulaire](https://script.google.com/macros/s/AKfycbx1I5MSCD5HsThFZ3jFJ_2rekGFMuoiztfBrIKkM92kIb6rh-EoKdXKjKDXGzLftK9-dA/exec) |
| Dashboard admin | [Ouvrir le dashboard](https://script.google.com/macros/s/AKfycbx1I5MSCD5HsThFZ3jFJ_2rekGFMuoiztfBrIKkM92kIb6rh-EoKdXKjKDXGzLftK9-dA/exec?page=admin) |
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
| `src/Reliability.gs` | Migration additive des identifiants et modification des événements |
| `src/Background.gs` | File persistante, traitement des feuilles et consultation des envois |
| `src/AdminTools.html` | Modification des rendez-vous, emails et détails réservés au bureau |
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
    - Public : https://script.google.com/macros/s/AKfycbx1I5MSCD5HsThFZ3jFJ_2rekGFMuoiztfBrIKkM92kIb6rh-EoKdXKjKDXGzLftK9-dA/exec
    - Admin : https://script.google.com/macros/s/AKfycbx1I5MSCD5HsThFZ3jFJ_2rekGFMuoiztfBrIKkM92kIb6rh-EoKdXKjKDXGzLftK9-dA/exec?page=admin

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
4. Le membre entre son code et retrouve son identité, ses réponses et les événements. Il retrouve sa réponse sous chaque événement : **Présent**, **Absent**, **Je ne sais pas encore**, **Excusé**. Le bouton **Enregistrer toutes mes réponses**, disponible avant et après les événements, enregistre tous ses choix modifiés en un seul clic, y compris ceux masqués par les filtres. **Enregistrer cet événement uniquement** enregistre seulement la fiche concernée ; une alerte précise les autres réponses encore à enregistrer. Aucune seconde validation n’est nécessaire pour une réponse déjà enregistrée.
5. **Remplacer le code** invalide l’ancien code et les sessions en cours. **Désactiver** retire l’accès sans effacer les réponses.

Les codes personnels sont affichés une seule fois et conservés sous forme d’empreintes dans les propriétés du script, pas dans le Sheet ni dans GitHub. **Rester connecté sur cet appareil**, coché par défaut, permet au membre de revenir sans ressaisir son code pendant 90 jours. Seul un jeton aléatoire est mémorisé dans le navigateur ; le code personnel n’y est pas conservé. La session persistante est enregistrée côté serveur sous l’empreinte de ce jeton et ne dépend pas du cache temporaire Google. Cinq appareils au maximum sont mémorisés par membre ; l’ajout d’un sixième remplace un ancien accès. La déconnexion, le remplacement du code ou sa révocation invalident l’accès mémorisé ; un membre inactif ne peut plus utiliser sa session.

Sur un appareil partagé, décocher cette option : la connexion ne reste alors disponible que dans l’onglet courant, pendant quatre heures au maximum. Si le navigateur bloque la mémorisation, l’application le précise sans empêcher la connexion. L’effacement des données du navigateur peut imposer une nouvelle saisie du code. L’espace bureau conserve sa session de quatre heures ; les rôles restent distincts et contrôlés côté serveur à chaque appel.

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


### Réponses par événement — septembre 2026

- Chaque événement affiche sa date complète, ses horaires et le commentaire du bureau. Les choix enregistrés sont préremplis lors d’une nouvelle connexion.
- **Excusé** ouvre un motif déroulant. **Autres** et **Engagement compagnonnique ailleurs** exigent une précision. Le code stocke « Absent excusé » pour préserver les anciennes données.
- **Repas et aide** propose repas seulement, repas et aide, aide seulement sans repas. **Réception** propose matin et/ou soir. L’aide peut comporter des horaires et chaque réponse un commentaire.
- Les modifications masquées par un filtre restent dans l’envoi. Un échec conserve la saisie ; un nouvel essai identique ne crée pas de doublon.
- La dernière réponse de chaque personne à chaque événement est retenue par les comptes rendus, le dashboard mensuel/annuel et `SUIVI_ANNUEL`. L’historique brut reste dans `REPONSES`.
- Absents, excusés, indécis et sans réponse sont comptés séparément. Les repas et créneaux sont visibles dans le suivi événement et les comptes rendus.

Dans **Bureau > Événements**, choisir un modèle **Réunion … — 19 h à confirmer**, **Fête Paris — dimanche** ou **Réception — samedi**. Renseigner la date réelle et adapter les horaires/précisions. Le champ **Choix proposés aux membres** règle les modalités. Ces modèles complètent ceux du classeur sans écraser les modèles personnalisés. Les dates et horaires des événements déjà créés ne sont pas remplacés automatiquement.

Pour un événement existant, compléter `Commentaire` et la nouvelle colonne `Modalites` dans `CALENDRIER` : `Standard`, `Repas et aide` ou `Réception`. Les modèles personnalisés peuvent utiliser la même colonne dans `BASE_EVENEMENTS`.

Après publication de la nouvelle version Google, les colonnes facultatives sont ajoutées à la première ouverture : `Modalites` dans le calendrier et la base, `Participation` et `Creneaux` dans les réponses. La migration conserve les lignes existantes et repère les en-têtes même en ligne 3. Il n’est pas nécessaire de réinstaller le classeur. Les feuilles calculées s’actualisent au prochain enregistrement ou depuis le menu du Sheet.

Les tests couvrent les envois mixtes, les modifications, la séparation des comptes, la reprise sur erreur, les modalités repas/créneaux et l’extension du classeur.

## Confirmations et rappels par mail

Chaque nouvelle réponse enregistrée reçoit un accusé par événement, à l’adresse du membre dans `MEMBRES`. Une modification reçoit un nouvel accusé. Il contient le rendez-vous, les horaires, la réponse, les modalités, la référence d’enregistrement et le lien de l’espace membre. Il atteste l’enregistrement de la réponse, pas la présence effective. Les codes personnels, motifs détaillés et commentaires privés ne figurent pas dans le mail.

Avant l’enregistrement, l’espace membre explique quel bouton utiliser et indique l’adresse de réception. Si les mails ne sont pas activés ou si l’adresse manque, le message le précise et confirme que les réponses peuvent quand même être enregistrées. L’envoi peut être différé ; la confirmation à l’écran fait foi pour l’enregistrement dans le Sheet, indépendamment de la réception du mail.

**Activation unique par le propriétaire du projet Google**, une fois les sources synchronisées :

1. Ouvrir le projet Apps Script associé au Sheet, sélectionner `activerMails` dans la liste des fonctions puis **Exécuter**. Accepter les autorisations Google d’envoi de mails et de gestion du déclencheur. Utiliser un seul compte propriétaire pour cette installation.
2. Cette fonction crée `JOURNAL_MAILS` et un déclencheur horaire. Elle est idempotente et n’envoie aucun mail pendant l’installation. Elle n’envoie pas de confirmations rétroactives pour les anciennes réponses.
3. Publier les sources mises à jour via **Déployer → Gérer les déploiements → crayon → Nouvelle version → Déployer**, sur le déploiement existant. Conserver le lien actuel et ses réglages d’accès. La synchronisation GitHub seule ne publie pas la version Web.
4. Dans **Bureau → Réglages**, actualiser pour consulter l’activation, le dernier passage et les envois en attente/à vérifier. Compléter les adresses manquantes dans les profils du Sheet.

Les rappels concernent les membres actifs ayant répondu **Présent** ou **Je ne sais pas encore** (également l’ancien choix « Disponible pour aider »). Ils utilisent la dernière réponse et la date actuelle de l’événement actif, même pour une inscription antérieure à l’activation. Les absents, excusés et membres sans réponse ne sont pas relancés.

Le déclencheur demande un passage toutes les cinq minutes : rappel la veille entre 9 h et 21 h, heure de Paris, sans garantie d’une minute précise. Un événement reporté pourra recevoir un rappel pour sa nouvelle date. Les confirmations sont traitées en arrière-plan après l’enregistrement (50 envois au maximum par passage), avec priorité aux rappels. Une confirmation encore en attente est remplacée par la dernière réponse du membre. Les quotas Google peuvent retarder les confirmations ; un rappel dont la journée est dépassée n’est pas envoyé tardivement.

Le journal conserve les états `ATTENTE`, `SANS_EMAIL`, `EN_COURS`, `ENVOYE`, `A_VERIFIER` et `ANNULE`. `ENVOYE` signifie que Google a accepté le message, pas une preuve de réception. Les entrées `EN_COURS` ou `A_VERIFIER` ne sont jamais renvoyées automatiquement après une erreur ambiguë : vérifier les exécutions et la remise du mail avant toute relance manuelle. Une erreur d’envoi ne supprime pas les réponses enregistrées.

Pour arrêter les mails, le propriétaire exécute `desactiverMails`. Le journal reste conservé. Les tests utilisent un service mail simulé : aucun message n’est envoyé à des membres réels.
