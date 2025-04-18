# Données Pitchou d'un document-type

Ce document liste les données disponibles pour les zones à remplir.

Si vous ne comprenez pas cette page ou si elle contient une information fausse, nous vous invitons à <a href="mailto:pitchou@beta.gouv.fr">contacter l'équipe pitchou</a> pour que nous puissions améliorer cette page

Les données ont un **type** qui peut être :
- **texte** (qui peut être aussi appelé "chaîne de caractères" ou "string")
- **nombre** 
- **date**
- **booléen** (vrai ou faux)
- **objet**, un type qui possède d'autres données nommées (accessibles via <code>objet.propriété</code>)
- **collection**, une liste de données

Les données disponibles sont :
- <code>{nom}</code> (type: texte) - Nom du dossier
- <code>{demandeur}</code> (type: texte) - Nom du porteur de projet, avec numéro de SIRET si c'est une personne morale
- <code>{localisation}</code> (type: texte) - Localisation du dossier
- <code>{activité_principale}</code> (type: texte) - Activité principale du dossier
- <code>{régime_autorisation_environnementale}</code> (type: texte) - Nom du dossier
- <code>{identifiant_onagre}</code> (type: texte) - Identifiant Onagre du dossier si présent
- <code>{espèces_impacts}</code> (type: collection d'objets) - La liste des espèces impactées telles que listées par le pétitionnaire groupées par impact. Chaque objet contient les propriétés suivantes :
    - <code>{activité}</code> (type: texte) - impact sur l'espèce
    - <code>{espèces}</code> (type: collection d'objets) - représente une espèce impactée. Chaque objet contient les propriétés suivantes : 
        - <code>{nomVernaculaire}</code>
        - <code>{nomScientifique}</code>




