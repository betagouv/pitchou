# Données Pitchou d'un document-type

Ce document liste les données disponibles pour les zones à remplir.

Les données ont un **type** qui peut être :
- **texte** (qui peut être aussi appelé "chaîne de caractères" ou "string")
- **nombre** 
- **date**
- **booléen** (vrai ou faux)
- **objet**, un type qui possède d'autres données nommées (accessibles via <code>objet.propriété</code>)
- **collection**, une liste de données

Les données disponibles sont :

Balise | Type de balise | Donnée correspondante
 :--- | :--- | :--- 
{nom} | texte | Nom du dossier
{demandeur} | texte | Nom du porteur de projet, avec numéro de SIRET si c'est une personne morale
{localisation} | texte | Localisation du dossier
{activité_principale} | texte | Activité principale du dossier
{régime_autorisation_environnementale} | texte | 'Oui' ou 'Non'
{identifiant_onagre} | texte | Identifiant Onagre du dossier si présent
{espèces_impacts} | **collection d'objets** | liste les espèces et l'impact pour chacune, telles que remplies par le pétitionnaire. Chaque objet (= espèce + impact) contient les propriétés : {activité} et {espèces}
{activité} | texte | Impact sur l'espèce
{espèces} | **collection d'objets** | liste les espèces. Chaque objet (= espèce) contient les propriétés suivantes : {nomVernaculaire} et {nomScientifique}
{nomVernaculaire} | texte | Nom vernaculaire de l'espèce
{nomScientifique} | texte | Nom scientifique de l'espèce



Si vous ne comprenez pas cette page ou si elle contient une information fausse, nous vous invitons à <a href="mailto:pitchou@beta.gouv.fr">contacter l'équipe pitchou</a> pour que nous puissions améliorer cette page



