# Document-types

Les [document-types](../index.md) sont des "modèles" vous permettant ensuite de **générer en un clic des documents remplis avec les données d'un dossier.**

Les document-types sont : 
- des **fichiers .odt** (comme vous avez l'habitude d'en lire et écrire avec LibreOffice (ou Microsoft Word))
- dans lesquels le contenu est composé de **balises qui seront remplacées par les données du dossier**

Une balise est composée 
- **d'accolades** ( <code>{</code> et <code>}</code> )
- et du **nom de la donnée** qui remplacera la balise

Par exemple : 
- <code>{ nom }</code> pour mettre le nom du dossier
- <code>{ localisation }</code> pour la localisation du dossier
- <code>{ demandeur }</code> pour le nom du porteur de projet.

Les balises ont des types qui peuvent être
- **texte** (qui peut être aussi appelé "chaîne de caractères" ou "string")
- **nombre** 
- **date**
- **booléen** (vrai ou faux)
- **objet**, un type qui possède d'autres données nommées (accessibles via <code>objet.propriété</code>)
- **collection**, une liste de données


## Balises disponibles

Les balises disponibles sont :

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




## Exemples 

### Génération d'un accusé de réception

Imaginons que la DREAL Île-de-France reçoive un dossier nommé "Éoliennes sur le toit de la Tour Séquoïa" porté par la Région Île-de-France à La Défense. On souhaite générer un accusé de réception du dossier.

#### Document-type pour accusé de réception
Le document-type ressemblerait à :
```
Bonjour { demandeur },

Nous avons bien reçu votre dossier { nom } situé à { localisation }

Nous reviendrons vers vous quand nous aurons vérifié que le dossier est complet et régulier

Nous vous souhaitons une belle journée,

La DREAL Île-de-France
```

#### Accusé de réception issu du document-type

```
Bonjour Région Île-de-France,

Nous avons bien reçu votre dossier Éoliennes sur le toit de la Tour Séquoïa situé à La Défense (92)

Nous reviendrons vers vous quand nous aurons vérifié que le dossier est complet et régulier

Nous vous souhaitons une belle journée,

La DREAL Île-de-France
```


### Génération d'une liste

Les balises de type "collection" peuvent générer des listes.
Pour afficher les données dans une liste, il faut utiliser une boucle qui
- commence par <code>{#each liste as élément}</code> 
- se terminent par <code>{/each}</code>

#### Exemple de liste
```
{#each liste as élément}
Contenu qui est répété pour chaque élément
{/each}
```

**liste** est le nom de la liste\
**élément** est un nom que vous pouvez choisir librement et qui sera utilisé pour nommer chaque élément de la liste un à la fois dans la zone qui est répétée pour chaque élément

Imaginons une liste <code>espèces</code> qui contient 4 éléments ("bruant des roseaux", "fauvette pitchou," "aigle botté" et "coucou geai")

et un document type qui contient:

```
Voici les oiseaux les plus importants au monde : 

{#each espèces as oiseau}
🐦 oiseau impacté : {oiseau}
{/each}
```

Le document généré ressemblera à :

```
Voici les oiseaux les plus importants au monde : 

🐦 oiseau impacté : bruant des roseaux
🐦 oiseau impacté : fauvette pitchou
🐦 oiseau impacté : aigle botté
🐦 oiseau impacté : coucou geai
```


## Points de vigilance

**ℹ️ Point d'attention :**
Le mécanisme de génération est précis et sensible. Il n'est pas tolérant aux erreurs, même d'une seule lettre. Ainsi, s'il est attendu <code>{ demandeur }</code>, alors <code>{ pétitionnaire }</code> ne marchera pas. <code>{ demandeur }</code> (au pluriel) ne marche pas non plus

```
✅ { demandeur } # attendu
✅ {demandeur} # sans espaces proches des accalades
❌ { pétitionnaire } # nom différent
❌ { demandeurs } # pluriel inattendu
❌ { deman deur } # espace au milieu du nom
```

**💡 Conseil :** Ne pas écrire les zones à remplir à la main, mais plutôt les copier-coller d'un autre document-type qui fonctionne



