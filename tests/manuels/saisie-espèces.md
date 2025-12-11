# Test manuel saisie espèces

## Description

Il s'agit du formulaire où le pétitionnaire saisit les données associées aux espèces protégées dérangées par ses opérations (espèces, surfaces d'habitat, nombre d'individus, de nids et données pour le rapportage européen, activité, méthodes, moyen de poursuite)


## Test manuel

1) la page http://localhost:2648/saisie-especes s'affiche

2) saisir une espèce de chaque type, remplir 1 valeur pour chaque champ, générer le lien, l'ouvrir dans un nouvel onglet, vérifier que c'est exactement le même contenu suite à l'ouverture du lien

3) tester la saisie par texte libre

4) tester la saisie par groupe d'espèces



## Saisie espèces protégées

- **Créer un fichier**


    Étapes : 
    1. choisir une espèce d'oiseau, rajouter des données pour chaque case
    2. faire la même chose pour une faune non-oiseau
    3. faire la même chose avec une flore
    4. télécharger le fichier
    5. vérifier que les données sont correctes

- **Affichage de la page de saisie**  

  Étapes :  
  1. Accéder à l’URL `http://localhost:2648/saisie-especes`.  

  Résultat attendu :  
  - La page s’affiche correctement.

- **Saisie complète et vérification du lien généré**  

  Étapes :  
  1. Saisir une espèce de chaque type.  
  2. Remplir une valeur pour chaque champ.  
  3. Générer le lien.  
  4. Ouvrir le lien dans un nouvel onglet.  
  5. Vérifier que le contenu est identique à celui avant ouverture.  

  Résultat attendu :  
  - Contenu strictement identique entre la saisie initiale et l’ouverture via le lien généré.

- **Saisie par texte libre**  

  Étapes :  
  1. Tester la saisie des espèces via l’option texte libre.  

  Résultat attendu :  
  - La saisie par texte libre est correctement enregistrée et affichée.

- **Saisie par groupe d’espèces**  

  Étapes :  
  1. Tester la saisie des espèces via la sélection par groupe.  

  Résultat attendu :  
  - Les données saisies par groupe d’espèces sont correctement enregistrées et affichées.



