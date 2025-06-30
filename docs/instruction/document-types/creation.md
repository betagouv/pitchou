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

Les balises ont des types qui peuvent être :
- **texte**
- **nombre** 
- **date**
- **booléen** (vrai ou faux)
- **liste**, une liste de données

<!--
- **objet**, un type qui possède d'autres données nommées (accessibles via <code>objet.propriété</code>)
-->

## Balises disponibles

<div class="fr-table">
    <div class="fr-table__wrapper">
        <div class="fr-table__container">
            <div class="fr-table__content">
                <table>
                    <caption>Liste des balises disponibles</caption>
                    <thead>
                        <tr> 
                            <th scope="col"> Balise
                            <th scope="col"> Type de balise
                            <th scope="col"> Description
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th scope="row"> {nom}
                            <td> texte
                            <td> Nom du dossier
                        </tr>
                        <tr>
                            <th scope="row"> {demandeur}
                            <td> texte
                            <td> Nom du porteur de projet, avec numéro de SIRET si c'est une personne morale
                        </tr>
                        <tr>
                            <th scope="row"> {localisation}
                            <td> texte
                            <td> Localisation du dossier
                        </tr>
                        <tr>
                            <th scope="row"> {activité_principale}
                            <td> texte
                            <td> Activité principale du dossier
                        </tr>
                        <tr>
                            <th scope="row"> {description}
                            <td> texte
                            <td> Description du projet fournie par le pétitionnaire
                        </tr>
                        <tr>
                            <th scope="row"> {régime_autorisation_environnementale_renseigné}
                            <td> booléen
                            <td> Valeur indiquant si l'information relative à l'Autorisation Environnementale a été renseignée dans le formulaire.
                        </tr>
                        <tr>
                            <th scope="row"> {régime_autorisation_environnementale}
                            <td> booléen
                            <td> Valeur indiquant si le projet est soumis ou non au régime de l'Autorisation Environnementale.
                        </tr>
                        <tr>
                            <th scope="row"> {justification_absence_autre_solution_satisfaisante}
                            <td> texte
                            <td> Justification de l'absence d'autre solution satisfaisante (Article L411-2 du Code de l'Environnement)
                        </tr>
                        <tr>
                            <th scope="row"> {motif_dérogation}
                            <td> texte
                            <td> Motif de la dérogation (Article L411-2 du Code de l'Environnement) (RIIPM, fins scientifiques, etc.)
                        </tr>
                        <tr>
                            <th scope="row"> {justification_motif_dérogation}
                            <td> texte
                            <td> Justification du motif
                        </tr>
                        <tr>
                            <th scope="row"> {identifiant_onagre}
                            <td> texte
                            <td> Identifiant Onagre du dossier si présent
                        </tr>
                        <tr>
                            <th scope="row"> {identifiant_pitchou}
                            <td> texte
                            <td> Identifiant du Dossier Pitchou
                        </tr>
                        <tr>
                            <th scope="row"> {liste_espèces_par_impact}
                            <td> <strong>liste</strong>
                            <td> Liste les impacts et les espèces concernées par cet impact. Chaque élément de la liste contient les propriétés : {liste_noms_impacts_quantifiés} et {liste_espèces}.
                        </tr>
                        <tr>
                            <th scope="row"> {date_début_intervention}
                            <td> date
                            <td> Date de début de l'intervention
                        </tr>
                        <tr>
                            <th scope="row"> {date_fin_intervention}
                            <td> date
                            <td> Date de fin de l'intervention
                        </tr>
                        <tr>
                            <th scope="row"> {durée_intervention}
                            <td> nombre
                            <td> Durée de l'intervention
                        </tr>
                        <tr>
                            <th scope="row"> {scientifique.type_demande}
                            <td> <strong>liste</strong> de texte
                            <td> 
                        </tr>
                        <tr>
                            <th scope="row"> {scientifique.description_protocole_suivi}
                            <td> texte
                            <td> 
                        </tr>
                        <tr>
                            <th scope="row"> {scientifique.mode_capture}
                            <td> texte
                            <td> 
                        </tr>
                        <tr>
                            <th scope="row"> {scientifique.modalités_source_lumineuses}
                            <td> texte
                            <td> 
                        </tr>
                        <tr>
                            <th scope="row"> {scientifique.modalités_marquage}
                            <td> texte
                            <td> 
                        </tr>
                        <tr>
                            <th scope="row"> {scientifique.modalités_transport}
                            <td> texte
                            <td> 
                        </tr>
                        <tr>
                            <th scope="row"> {scientifique.périmètre_intervention}
                            <td> texte
                            <td> 
                        </tr>
                        <tr>
                            <th scope="row"> {scientifique.intervenants}
                            <td> <strong>liste</strong>
                            <td> 
                        </tr>
                        <tr>
                            <th scope="row"> {scientifique.précisions_autres_intervenants}
                            <td> texte
                            <td> 
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

Pour la liste {liste_espèces_par_impact}, chaque élément de la liste contient :

Balise | Type de balise | Donnée correspondante
 :--- | :--- | :--- 
{impact} | texte | Type d'impact (ex : desctruction, capture, cueillette…)
{liste_espèces} | **liste** | Liste les espèces concernées par un impact. Chaque élément de la liste contient les propriétés : {nomVernaculaire}, {nomScientifique} et {liste_impacts_quantifiés}
{liste_noms_impacts_quantifiés} | **liste** | Liste des noms des impacts quantifiés (Surface, Nombre d'individus...)

Pour la liste {liste_espèces}, chaque élément de la liste contient :

Balise | Type de balise | Donnée correspondante
 :--- | :--- | :--- 
{nomVernaculaire} | texte | Nom vernaculaire de l'espèce
{nomScientifique} | texte | Nom scientifique de l'espèce
{liste_impacts_quantifiés} | **liste** | Liste des impacts quantifiés (Surface, nombre d'individus...). Cette liste est alignée avec {liste_noms_impacts_quantifiés}.

Pour la liste {scientifique.intervenants}, chaque élément de la liste contient :

Balise | Type de balise | Donnée correspondante
 :--- | :--- | :--- 
{nom_complet} | texte | Nom de la personne scientifique qui intervient
{qualification} | texte | Qualification de la personne scientifique qui intervient


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



