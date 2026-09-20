# Identité de l’application

Le logo rouge et bleu de l’Union Compagnonnique Paris provient du PDF `PARIS_Logo UC.pdf` fourni par la Cayenne. Il remplace le petit écusson historique dans l’en-tête commun.

Deux déclinaisons réalisées à partir de cette identité distinguent les accès :

- **Bureau** : cadre bleu marine et clé, dans `src/BrandBureau.html` ; visible dans l’administration et sur la carte Bureau de l’accueil.
- **Membres** : cadre rouge et groupe, dans `src/BrandMembres.html` ; visible dans l’espace membre et sur la carte Membres de l’accueil.
- **Logo commun** : `src/Brand.html`, dans l’en-tête de l’accueil.

Les images sont embarquées en WebP (512 px maximum), sans URL Drive ni dépendance à une autorisation d’image. Leurs proportions sont conservées. Les styles adaptent leur taille sur téléphone et ordinateur.

Les pages Apps Script utilisent ces fragments HTML. `index.html`, l’accueil GitHub Pages, contient les mêmes fragments et les liens du déploiement public actuel. Les styles communs restent dans `src/Styles.html` et les icônes dans `src/Ui.html`.

Les déclinaisons Bureau et Membres sont des visuels pour cette application, pas de nouveaux emblèmes officiels. La palette bordeaux et ivoire de l’interface reste inchangée.

Après synchronisation GitHub vers Apps Script, publier une nouvelle version du déploiement existant depuis le compte propriétaire pour afficher les logos sur l’application publique. La synchronisation ne remplace pas cette publication Google.
