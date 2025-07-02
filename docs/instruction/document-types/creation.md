# Document-types

## Table des matières

- [Balises disponibles](#balises-disponibles)
- [Exemples](#exemples)
  - [Génération d'un accusé de réception](#génération-dun-accusé-de-réception)
  - [Affichage conditionnel ({#if})](#affichage-conditionnel-if)
  - [Génération d'une liste ({#each})](#génération-dune-liste-each)
- [Points de vigilance](#points-de-vigilance)

---

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

Les balises ont des types qui peuvent être :
- **texte**
- **nombre** 
- **date**
- **booléen** (vrai ou faux)
- **liste**, une liste de données

<!--
- **objet**, un type qui possède d'autres données nommées (accessibles via <code>objet.propriété</code>)
-->
---

&nbsp;

## Balises disponibles

<div class="fr-table">
    <div class="fr-table__wrapper">
        <div class="fr-table__container">
            <div class="fr-table__content">
                <table>
                    <caption>Liste des balises disponibles</caption>
                    <thead>
                        <tr> 
                            <th scope="col"> Balise</th>
                            <th scope="col"> Type de balise</th>
                            <th scope="col"> Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th scope="row"> <code>{activité_principale}</code></th>
                            <td> texte</td>
                            <td> Activité principale du dossier</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{date_début_intervention}</code></th>
                            <td> date</td>
                            <td> Date de début de l'intervention</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{date_fin_intervention}</code></th>
                            <td> date</td>
                            <td> Date de fin de l'intervention</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{demandeur}</code></th>
                            <td> texte</td>
                            <td> Nom du porteur de projet, avec numéro de SIRET si c'est une personne morale</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{description}</code></th>
                            <td> texte</td>
                            <td> Description du projet fournie par le pétitionnaire</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{durée_intervention}</code></th>
                            <td> nombre</td>
                            <td> Durée de l'intervention</td>
                        </tr>
                        <tr>
                            <th scope="row"><code>{enjeu_écologique}</code></th>
                            <td>Booléen</td>
                            <td>Ce champ vaut <code>true</code> si le dossier présente un enjeu écologique, sinon <code>false</code></td>
                        </tr>
                        <tr>
                            <th scope="row"><code>{enjeu_politique}</code></th>
                            <td>Booléen</td>
                            <td>Ce champ vaut <code>true</code> si le dossier présente un enjeu politique, sinon <code>false</code></td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{identifiant_onagre}</code></th>
                            <td> texte</td>
                            <td> Identifiant Onagre du dossier si présent</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{identifiant_pitchou}</code></th>
                            <td> texte</td>
                            <td> Identifiant du Dossier Pitchou</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{justification_absence_autre_solution_satisfaisante}</code></th>
                            <td> texte</td>
                            <td> Justification de l'absence d'autre solution satisfaisante (Article L411-2 du Code de l'Environnement)</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{justification_motif_dérogation}</code></th>
                            <td> texte</td>
                            <td> Justification du motif</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{liste_espèces_par_impact}</code></th>
                            <td> <strong>liste</strong></td>
                            <td> Liste les impacts et les espèces concernées par cet impact. Chaque élément de la liste contient les propriétés : <code>{liste_noms_impacts_quantifiés}</code> et <code>{liste_espèces}</code>.</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{localisation}</code></th>
                            <td> texte</td>
                            <td> Localisation du dossier</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{mesures_erc_prévues}</code></th>
                            <td> booléen</td>
                            <td> Valeur indiquant si le dossier prévoit des mesures ERC ou non.</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{motif_dérogation}</code></th>
                            <td> texte</td>
                            <td> Motif de la dérogation (Article L411-2 du Code de l'Environnement) (RIIPM, fins scientifiques, etc.)</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{nom}</code></th>
                            <td> texte</td>
                            <td> Nom du dossier</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{régime_autorisation_environnementale}</code></th>
                            <td> booléen</td>
                            <td> Valeur indiquant si le projet est soumis ou non au régime de l'Autorisation Environnementale.</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{régime_autorisation_environnementale_renseigné}</code></th>
                            <td> booléen</td>
                            <td> Valeur indiquant si l'information relative à l'Autorisation Environnementale a été renseignée dans le formulaire.</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{scientifique.description_protocole_suivi}</code></th>
                            <td> texte</td>
                            <td> </td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{scientifique.intervenants}</code></th>
                            <td> <strong>liste</strong></td>
                            <td> </td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{scientifique.mode_capture}</code></th>
                            <td> texte</td>
                            <td> </td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{scientifique.modalités_marquage}</code></th>
                            <td> texte</td>
                            <td> </td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{scientifique.modalités_source_lumineuses}</code></th>
                            <td> texte</td>
                            <td> </td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{scientifique.modalités_transport}</code></th>
                            <td> texte</td>
                            <td> </td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{scientifique.périmètre_intervention}</code></th>
                            <td> texte</td>
                            <td> </td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{scientifique.précisions_autres_intervenants}</code></th>
                            <td> texte</td>
                            <td> </td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{scientifique.type_demande}</code></th>
                            <td> <strong>liste</strong> de texte</td>
                            <td> </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

&nbsp;

Pour la liste {liste_espèces_par_impact}, chaque élément de la liste contient :

<div class="fr-table">
    <div class="fr-table__wrapper">
        <div class="fr-table__container">
            <div class="fr-table__content">
                <table>
                    <caption>Propriétés de {liste_espèces_par_impact}</caption>
                    <thead>
                        <tr> 
                            <th scope="col"> Balise</th>
                            <th scope="col"> Type de balise</th>
                            <th scope="col"> Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th scope="row"> <code>{impact}</code></th>
                            <td> texte</td>
                            <td> Type d'impact (ex : destruction, capture, cueillette…)</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{liste_espèces}</code></th>
                            <td> <strong>liste</strong></td>
                            <td> Liste les espèces concernées par un impact. Chaque élément de la liste contient les propriétés : <code>{liste_impacts_quantifiés}</code>, <code>{nomScientifique}</code> et <code>{nomVernaculaire}</code></td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{liste_noms_impacts_quantifiés}</code></th>
                            <td> <strong>liste</strong></td>
                            <td> Liste des noms des impacts quantifiés (Surface, Nombre d'individus...)</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

&nbsp;

Pour la liste {liste_espèces}, chaque élément de la liste contient :

<div class="fr-table">
    <div class="fr-table__wrapper">
        <div class="fr-table__container">
            <div class="fr-table__content">
                <table>
                    <caption>Propriétés de {liste_espèces}</caption>
                    <thead>
                        <tr> 
                            <th scope="col"> Balise</th>
                            <th scope="col"> Type de balise</th>
                            <th scope="col"> Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th scope="row"> <code>{liste_impacts_quantifiés}</code></th>
                            <td> <strong>liste</strong></td>
                            <td> Liste des impacts quantifiés (Surface, nombre d'individus...). Cette liste est alignée avec <code>{liste_noms_impacts_quantifiés}</code>.</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{nomScientifique}</code></th>
                            <td> texte</td>
                            <td> Nom scientifique de l'espèce</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{nomVernaculaire}</code></th>
                            <td> texte</td>
                            <td> Nom vernaculaire de l'espèce</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

Pour la liste {scientifique.intervenants}, chaque élément de la liste contient :

<div class="fr-table">
    <div class="fr-table__wrapper">
        <div class="fr-table__container">
            <div class="fr-table__content">
                <table>
                    <caption>Propriétés de {scientifique.intervenants}</caption>
                    <thead>
                        <tr> 
                            <th scope="col"> Balise</th>
                            <th scope="col"> Type de balise</th>
                            <th scope="col"> Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th scope="row"> <code>{nom_complet}</code></th>
                            <td> texte</td>
                            <td> Nom de la personne scientifique qui intervient</td>
                        </tr>
                        <tr>
                            <th scope="row"> <code>{qualification}</code></th>
                            <td> texte</td>
                            <td> Qualification de la personne scientifique qui intervient</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

&nbsp;

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

### Affichage conditionnel ({#if})

Il est possible d'afficher un morceau de document seulement si certaines conditions sont remplies.

Par exemple, imaginons que l'on souhaite afficher le numéro de dossier Onagre.

On pourrait écrire :
```
Numéro de dossier Onagre : {identifiant_onagre}
```

S'il y a un numéro Onagre, le résultat sera : 
```
Numéro de dossier Onagre : 165876498
```

Toutefois, si le dossier pitchou n'a pas de numéro Onagre associé, on va se retrouver avec le résultat suivant : 
```
Numéro de dossier Onagre :
```

---

Pour faire un affichage plus propre, on peut utiliser l'affichage conditionnel pour que ce morceau de phrase ne s'affiche que s'il y a un numéro Onagre.

```
{#if identifiant_onagre}
Numéro de dossier Onagre : {identifiant_onagre}
{/if}
```

Dans ce cas-là, 

S'il y a un numéro Onagre, le résultat sera : 
```
Numéro de dossier Onagre : 165876498
```

Toutefois, si le dossier pitchou n'a pas de numéro Onagre associé, le résultat sera :
```
```
(il n'y a rien d'afficher)

---

Pour rendre les choses plus explicites, on pourrait vouloir écrire `(non renseigné)`. On peut utiliser le `{:else}` ("sinon"):

```
Numéro de dossier Onagre : {#if identifiant_onagre} {identifiant_onagre} {:else} (non renseigné) {/if}
```

Ainsi, s'il y a un numéro Onagre, le résultat sera : 
```
Numéro de dossier Onagre : 165876498
```

et s'il n'y a pas de numéro Onagre : 
```
Numéro de dossier Onagre : (non renseigné)
```



### Génération d'une liste ({#each})

Pour afficher les données d'une liste, il faut utiliser une boucle qui
- commence par <code>{#each LISTE as ÉLÉMENT}</code>
- se termine par <code>{/each}</code>

```
{#each LISTE as ÉLÉMENT}
Contenu qui est répété pour chaque {ÉLÉMENT}
{/each}
```

- **LISTE** est une balise qui de type "liste"
- **ÉLÉMENT** est un nom que vous pouvez choisir librement et qui sera utilisé par le générateur pour nommer chaque élément de la liste, un à la fois dans la zone qui est répétée. 

#### Exemple de liste

Imaginons une liste <code>liste_espèces</code> qui contient 4 éléments ("bruant des roseaux", "fauvette pitchou," "aigle botté" et "coucou geai")

et un document type qui contient:

```
Voici les oiseaux les plus importants au monde : 

{#each liste_espèces as oiseau}
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


