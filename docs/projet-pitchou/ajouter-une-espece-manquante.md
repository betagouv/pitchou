# Ajouter une espèce manquante

L'équipe Pitchou maintient une [liste d'espèces protégées par le Droit Français](https://github.com/betagouv/pitchou/blob/main/data/liste-esp%C3%A8ces-prot%C3%A9g%C3%A9es.csv), principalement basée sur la base de données TaxRef publiée par [l'INPN/MHNH](https://inpn.mnhn.fr/) 

Toutefois, des fois, cette base de donnée est incomplète et nous ne pouvons pas attendre que l'INPN la mette à jour pour pouvoir qu'elles apparaissent dans un dossier

Nous avons un mécanisme pour rajouter des espèces protégées dans Pitchou


## Rajouter une espèce à Pitchou

### Vérifier que l'on peut rajouter l'espèce

Quand nous recevons une demande pour rajouter une espèce, nous devons vérifier les points suivants : 
- Est-ce que cette espèce est protégée par le Droit Français ?
    - Si oui, nous avons besoin de la référence du texte légal qui protège cette espèce
- Est-ce qu'on nous a fournit le `CD_NOM` (la référence numérique dans TaxRef) ?
    - Si non, on peut la retrouver dans TaxRef via la ligne de commande 
    `cat <fichier_TAXREFvXX.txt> | grep '<nom espèce>'`
    (un jour, on pourra à nouveau le faire sur le site du MHNH)


### La rajouter dans le fichier `espèces_manquantes.ods`

Quand on a tout ça, on peut rajouter une ligne dans le fichier [espèces_manquantes.ods](https://github.com/betagouv/pitchou/blob/main/data/sources_especes/esp%C3%A8ces_manquantes.ods)


### Re-générer la liste d'espèce et déployer sur pitchou.beta.gouv.fr

Une personne à compétence de dev peut re-générer la liste d'espèce via : 
`node outils/liste-espèces.js`

puis, commit/Pull Request/merge/déploiement en production
