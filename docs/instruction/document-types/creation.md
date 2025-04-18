# Création document-types

Les [document-types](../index.md) permettent de générer des documents remplis avec les données d'un dossier en un clic

Les document-types sont des **fichiers .odt** comme vous avez l'habitude d'en lire et écrire avec LibreOffice (ou Microsoft Word) dans lesquels le contenu est un "texte à trou" qui sera rempli par Pitchou avec les données du dossier


## Définir des "zones à remplir"

Dans les documents-types, on définit des zones à remplir avec des accolades ( <code>{</code> et <code>}</code> ) qui contiennent le type de contenu à remplir, par exemple <code>{ nom }</code> pour mettre le nom du dossier, <code>{ localisation }</code> pour la localisation du dossier et <code>{ demandeur }</code> pour le nom du porteur de projet.

Par exemple, si on imagine que la DREAL Île-de-France reçoit un dossier qui s'appelle "Éoliennes sur le toit de la Tour Séquoïa" porté par la Région Île-de-France à La Défense. On pourrait vouloir générer un accusé de réception du dossier.
Le document-type ressemblerait à :
```
Bonjour { demandeur },

Nous avons bien reçu votre dossier { nom } situé à { localisation }

Nous reviendrons vers vous quand nous aurons vérifié que le dossier est complet et régulier

Nous vous souhaitons une belle journée,

La DREAL Île-de-France
```

Une fois généré, le contenu du document .odt généré ressemblerait à :

```
Bonjour Région Île-de-France,

Nous avons bien reçu votre dossier Éoliennes sur le toit de la Tour Séquoïa situé à La Défense (92)

Nous reviendrons vers vous quand nous aurons vérifié que le dossier est complet et régulier

Nous vous souhaitons une belle journée,

La DREAL Île-de-France
```

**ℹ️ Point d'attention :**
Le mécanisme de Pitchou qui trouve les zones à remplir est précis et sensible. Il n'est pas tolérant aux erreurs, même d'une seule lettre. Ainsi, s'il est attendu <code>{ demandeur }</code>, alors <code>{ pétitionnaire }</code> ne marchera pas. <code>{ demandeur }</code> (au pluriel) ne marche pas non plus

```
✅ { demandeur } # attendu
✅ {demandeur} # sans espaces proches des accalades
❌ { pétitionnaire } # nom différent
❌ { demandeurs } # pluriel inattendu
❌ { deman deur } # espace au milieu du nom
```

**💡 Conseil :** Ne pas écrire les zones à remplir à la main, mais plutôt les copier-coller d'un autre document-type qui fonctionne


**ℹ️ Point d'attention :**
Vous ne pouvez pas deviner les noms possibles pour les zones à remplir

[Les zones à remplir sont listées dans une page dédiée.](./donnees-disponibles.md)


## Afficher des listes

Dans certains cas, les données sont disponibles sous forme de listes. Pour afficher les données dans une liste, il faut utiliser des boucles qui commencent par <code>{#each liste as élément}</code> et se terminent par <code>{/each}</code>

Ça ressemble à ça :
```
{#each liste as élément}
zone qui est répétée pour chaque élément
{/each}
```

**liste** est le nom de la liste\
**élément** est un nom que vous pouvez choisir librement et qui sera utilisé nommé chaque élément de la liste un à la fois dans la zone qui est répétée pour chaque élément

Dans le document final, les morceaux <code>{#each liste as élément}</code> et <code>{/each}</code> disparaissent et sont remplacés par le morceau au milieu remplacé autant de fois qu'il y a d'éléments dans la liste

Imaginons une liste <code>espèces</code> qui contient 4 élémenst ("bruant des roseaux", "fauvette pitchou," "aigle botté" et "coucou geai")

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


