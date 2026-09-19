# Brancher le Sheet à GitHub

Le Google Sheet ne se branche pas directement à GitHub. Le bon montage est :

- GitHub garde le code ;
- Apps Script exécute le code ;
- Google Sheet garde les données.

Les données nominatives, les excuses et les motifs d'absence restent dans le Google Sheet. Le dépôt GitHub public ne doit contenir que le code.

## Liens actuels

- Formulaire public : https://script.google.com/macros/s/AKfycbx8DZydMvebuXtc0wr9tOuZW3lKQBsi7gB2La-xPGC4587bF1vzJtiT-EWU1cvsjNynCQ/exec
- Dashboard admin : https://script.google.com/macros/s/AKfycbx8DZydMvebuXtc0wr9tOuZW3lKQBsi7gB2La-xPGC4587bF1vzJtiT-EWU1cvsjNynCQ/exec?page=admin
- Google Sheet : https://docs.google.com/spreadsheets/d/1_atXm_AKfq2864aCabWhcyFerbix0xFPh2VUUC_pPs4/edit
- Dépôt GitHub : https://github.com/davidtranchaud79-svg/UC-cayenne-paris

## Étape 1 - Ajouter l'ID Apps Script à GitHub

1. Ouvrir le Google Sheet.
2. Aller dans `Extensions > Apps Script`.
3. Dans Apps Script, ouvrir `Paramètres du projet`.
4. Copier `ID du script`.
5. Dans [les secrets GitHub](https://github.com/davidtranchaud79-svg/UC-cayenne-paris/settings/secrets/actions), cliquer sur `New repository secret`.
6. Mettre `CLASP_SCRIPT_ID` dans `Name`, coller l'ID dans `Secret`, puis cliquer sur `Add secret`.

## Étape 2 - Activer l'API Apps Script

Avec le compte Google propriétaire de l'application, ouvrir [les paramètres Apps Script](https://script.google.com/home/usersettings) et activer `API Google Apps Script`.

## Étape 3 - Autoriser la connexion Google sur le Mac

Ouvrir Terminal avec `Commande + Espace`, puis saisir `Terminal`. Vérifier Node.js et npm :

```bash
node --version
npm --version
```

Si une commande est introuvable, installer [Node.js](https://nodejs.org/en/download) dans une version compatible avec le Mac. Utiliser une version LTS encore prise en charge, puis rouvrir Terminal.

Lancer la connexion :

```bash
npx --yes @google/clasp@3.4.1 login
```

Le navigateur ouvre Google. Choisir le compte propriétaire de l'application et autoriser les accès demandés par clasp. Attendre le message de connexion réussie dans Terminal.

## Étape 4 - Ajouter la connexion Google à GitHub

Dans Terminal, copier directement le fichier de connexion dans le presse-papiers :

```bash
pbcopy < "$HOME/.clasprc.json"
```

La commande ne montre aucun texte : c'est normal. Dans [les secrets GitHub](https://github.com/davidtranchaud79-svg/UC-cayenne-paris/settings/secrets/actions) :

1. Cliquer sur `New repository secret`.
2. Dans `Name`, écrire `CLASPRC_JSON`.
3. Dans `Secret`, coller avec `Commande + V`.
4. Cliquer sur `Add secret`.

Ce fichier permet d'accéder aux projets Apps Script du compte. Le coller uniquement dans le champ `Secret` de GitHub, sans le publier dans le dépôt, le Sheet ou une conversation.

`CLASPRC_JSON` remplace les quatre anciens secrets `CLASP_ACCESS_TOKEN`, `CLASP_REFRESH_TOKEN`, `CLASP_CLIENT_ID` et `CLASP_CLIENT_SECRET`. Le workflow utilise le fichier produit par clasp 3.4.1 avec le compte `default`.

## Étape 5 - Conserver le lien de l'application existante

Le workflow contient déjà l’identifiant public du déploiement, extrait du lien partagé :

```text
AKfycbx8DZydMvebuXtc0wr9tOuZW3lKQBsi7gB2La-xPGC4587bF1vzJtiT-EWU1cvsjNynCQ
```

Cet identifiant n’est pas un mot de passe. Il est conservé dans `.github/workflows/deploy-apps-script.yml` pour que la publication vise exactement le lien partagé. L’ancien secret `CLASP_DEPLOYMENT_ID` n’est plus utilisé et peut rester en place.

Les deux secrets requis sont :

| Secret | Contenu attendu |
|---|---|
| `CLASP_SCRIPT_ID` | ID du projet Apps Script |
| `CLASPRC_JSON` | Fichier de connexion complet copié par `pbcopy` |

Pour contrôler les valeurs enregistrées, ouvrir `Actions > Vérifier les secrets Apps Script > Run workflow`.
Ce contrôle vérifie la connexion Google et la présence du déploiement attendu dans le projet.
Il ne publie pas de nouvelle version et n’affiche aucune valeur de secret. Le résumé précise aussi
si l’ancien secret `CLASP_DEPLOYMENT_ID`, ignoré par la publication, contient un identifiant différent.

## Étape 6 - Lancer la première mise à jour

1. Ouvrir [Deploy Apps Script](https://github.com/davidtranchaud79-svg/UC-cayenne-paris/actions/workflows/deploy-apps-script.yml).
2. Cliquer sur `Run workflow`, choisir `main`, puis confirmer avec `Run workflow`.
3. Attendre que `Push sources to Apps Script` et `Update existing Web App` réussissent. Cette dernière étape doit indiquer `Publication vérifiée auprès de Google : version …`.
4. Ouvrir le formulaire public et le dashboard admin pour vérifier la nouvelle version.

Le workflow crée sa configuration, envoie les fichiers de `src/` vers Apps Script, vérifie que le déploiement appartient bien au projet, puis publie une nouvelle version au même lien. Il relit ensuite la version auprès de Google avant d’annoncer une réussite. Les prochaines modifications de `src/` sur `main` déclenchent cette mise à jour automatiquement.

Une ancienne exécution verte peut contenir `Invalid deployment ID` dans son journal : clasp 3.4.1 peut afficher cette erreur sans renvoyer de code d’échec. Le contrôle actuel refuse cette fausse réussite.

Si l'initialisation n'a jamais été faite, ouvrir Apps Script depuis le Sheet, sélectionner `setupSystem_`, cliquer sur `Exécuter` et accepter les autorisations Google.

Le lien public se termine par `/exec`. Le lien admin utilise le même déploiement avec `?page=admin` à la fin.

En cas d'échec :

- `Secret GitHub manquant` : ajouter le secret nommé dans l'erreur, puis relancer le workflow.
- `CLASPRC_JSON doit contenir le fichier JSON complet` ou `Connexion Google incomplète` : refaire les étapes 3 et 4.
- API désactivée : refaire l'étape 2 avec le compte utilisé lors de la connexion.
- Accès refusé ou connexion révoquée : reconnecter le compte propriétaire avec la commande de l'étape 3, puis remplacer `CLASPRC_JSON`.
- `Le lien public ne correspond pas au projet configuré` : vérifier que `CLASP_SCRIPT_ID` est bien l’ID du projet qui possède le déploiement partagé.

## Base d’événements

L’onglet `BASE_EVENEMENTS` sert de bibliothèque. Le bureau n’a pas besoin de recréer chaque événement de zéro :

1. ouvrir le dashboard admin ;
2. choisir un modèle ;
3. renseigner la date ;
4. ajuster titre, horaires ou lieu ;
5. ajouter au calendrier.

## Utilisation ensuite

Modifier le code dans le dépôt GitHub. Une modification directe dans Apps Script sera remplacée lors de la prochaine synchronisation depuis GitHub : la reporter d'abord dans le dépôt avant de relancer le workflow.

Les présences, excuses et événements continuent d'être saisis dans l'application et stockés dans le Sheet.

Référence : [documentation Google sur clasp et GitHub Actions](https://developers.google.com/apps-script/guides/clasp#cicd_for_apps_script_with_clasp_and_github_actions).
