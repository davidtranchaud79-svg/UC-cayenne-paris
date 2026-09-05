# Logiciel Présences, Engagements et Excuses - Cayenne

Ce pack contient une base Google Sheets + Apps Script pour suivre les présences sur l'année :

- formulaire public pour les sociétaires, aspirants et compagnons ;
- excuses possibles en avance sur plusieurs dates ;
- disponibilités pour aider sur les événements ;
- génération d'une feuille `CR_...` par événement ;
- suivi annuel par personne ;
- dashboard admin relié au Google Sheet ;
- export PDF d'une feuille événement pour l'intégrer au compte rendu.

## Fichiers

| Fichier | Utilité |
|---|---|
| `Modele_Presences_Engagements_Cayenne.xlsx` | Modèle de classeur à importer dans Google Sheets |
| `src/Code.gs` | Code serveur Apps Script |
| `src/Index.html` | Interface formulaire + dashboard |
| `src/appsscript.json` | Manifest Apps Script pour déploiement propre |

## GitHub

Le dépôt peut être poussé tel quel sur GitHub. Les fichiers temporaires, aperçus et archives ZIP sont exclus par `.gitignore`.

Structure conseillée :

- `src/Code.gs` : logique Google Sheets, dashboard, génération des feuilles `CR_...` ;
- `src/Index.html` : formulaire public et vue admin ;
- `src/appsscript.json` : configuration Apps Script ;
- `outputs/Modele_Presences_Engagements_Cayenne.xlsx` : modèle Excel de départ ;
- `README.md` : notice d'installation.

## Mise en place

1. Ouvrir le Google Sheet modèle.
2. Aller dans `Extensions > Apps Script`.
3. Créer ou remplacer le fichier `Code.gs` avec le contenu de `src/Code.gs`.
4. Créer un fichier HTML nommé `Index` et coller le contenu de `src/Index.html`.
5. Vérifier le fichier `appsscript.json` ou recopier les autorisations depuis `src/appsscript.json`.
6. Dans Apps Script, lancer la fonction `setupSystem`.
7. Retourner dans le Sheet et compléter les onglets `MEMBRES` et `CALENDRIER`.
8. Dans Apps Script, cliquer sur `Déployer > Nouveau déploiement > Application Web`.
9. Choisir :
   - Exécuter en tant que : `Moi`
   - Accès : selon votre choix, par exemple les personnes disposant du lien
10. Copier le lien du Web App et l'envoyer aux membres.

## Utilisation bureau

Depuis le Google Sheet, le menu `Présences UC` permet de :

- installer ou réparer le classeur ;
- actualiser le dashboard ;
- générer les feuilles événement ;
- exporter la feuille active en PDF.

Le code admin par défaut est `1234`. Il se modifie dans l'onglet `PARAMETRES`, ligne `admin_pin`.

## Logique de suivi

Toutes les réponses arrivent dans `REPONSES`.  
Les feuilles `CR_...` sont générées automatiquement depuis `REPONSES`.  
Le suivi annuel et le dashboard sont recalculés depuis les mêmes données.

Le bureau garde donc une source unique et évite les copies manuelles.
