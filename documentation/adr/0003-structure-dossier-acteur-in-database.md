# ADR-0003 : Structurer les autres personnes impliquées dans un dossier en base de données

_English version: [0003-structure-dossier-acteur-in-database.en.md](0003-structure-dossier-acteur-in-database.en.md)_

## Statut

Accepté

## Contexte

Il y avait des confusions côté métier sur les personnes impliquées dans un projet. Un petit mélange de langage métier et langage Démarche Numérique. L'[ADR-0002](0002-structure-porteur-de-projet-in-database.md) a structuré le porteur de projet. Cette fois-ci, on remet en ordre les autres personnes impliquées.

On distingue le déposant (mandataire ou non, pas obligatoire, provient de DN) et la personne contact. Un dossier a peut-être un déposant, peut-être une personne contact, peut-être d'autres types de personnes impliquées.

Jusqu'ici, ces personnes vivaient dans `identite_dossier` (une copie par type `demandeur`, `mandataire` ou `representant`) et dans `dossier.deposant`, qui pointait vers `personne`.

## Décision

**Une table `dossier_acteur`.** Un dossier peut ou pas avoir une ou plusieurs personnes impliquées. Une personne impliquée est forcément liée à un dossier et un rôle non nul. Côté donnée, la table `dossier_acteur` a comme colonnes : `id`, `dossier`, `involvement`, `personne_physique` (FK vers la table `personne_physique`). Toutes les colonnes de `dossier_acteur` sont non nulles. Supprimer un dossier supprime ses lignes `dossier_acteur`.

**Le rôle s'appelle `involvement`.** Le rôle correspond à la manière dont la personne est impliquée dans le dossier. Il s'appelle `involvement` pour ne pas confondre avec le `role` de `personne_physique`. Il peut être `mandataire`, `deposant`, `personne_contact`… et autre chose si besoin. C'est donc un string (pour l'instant champ libre). Même si côté donnée `involvement` est un champ libre pour le moment, tant que la spec n'est pas figée, le code a un type `Involvement`.

**Plusieurs rôles par personne, plusieurs personnes par rôle.** Une personne peut prendre plusieurs rôles pour le même dossier : deux lignes vers la même fiche `personne_physique`. On peut avoir plusieurs personnes pour un rôle. Un porteur personne physique qui dépose lui-même, c'est une seule fiche vers 3 références : `dossier.porteur_de_projet`, et les `dossier_acteur` `deposant` et `beneficiaire_demarche_numerique`.

**Comment on remplit les colonnes (essentiellement DN pour l'instant).**

- Le déposant est celui qui dépose dans Démarche Numérique (le demandeur de l'API DN ou le mandataire quand il existe).
- Le mandataire est le mandataire au sens de DN aujourd'hui. Un mandataire est forcément aussi un déposant.
- La personne contact est remplie avec le formulaire de DN. On la remplit seulement s'il y a le champ, on ne regarde pas le type de personne.
- On garde le rôle `beneficiaire_demarche_numerique`. Ce sera seulement le demandeur DN.

**Une resynchro ne garde que les rôles actuels.** Si le mandataire disparaît, ça supprime la ligne. Pour l'instant, on garde la `personne_physique`.

**Historique et notifications : on garde le même comportement.** Ils sont calculés sur `dossier_acteur`, avec les clés `involvement.propriété` (par exemple `personne_contact.phone`).

**Recherche : seulement sur le déposant et le mandataire.**

**Admin : Représentant devient Personne contact.**

**`dossier.deposant` est supprimée.** Le déposant est un `dossier_acteur`.

**`identite_dossier` est supprimée dans une autre PR.** En attendant, elle est encore écrite, mais plus lue.

**Les données existantes sont remplies par une resynchro.** Les dossiers qui ne viennent pas de Démarche Numérique ne sont pas resynchronisés : une migration les remplit depuis `identite_dossier`, avec les règles de l'admin.

## Conséquences

`identite_dossier` est encore écrite par la synchronisation, l'admin et les seeds, avec un commentaire qui annonce qu'on l'enlève bientôt. Elle ne produit plus d'historique, pour ne pas notifier deux fois le même changement.

Le premier remplissage des acteurs d'un dossier est enregistré dans l'historique comme base de référence, sans notification. La resynchro qui suit la migration ne marque donc pas tous les dossiers comme modifiés.

Les modifications faites dans l'admin ne produisent pas d'historique : elles ne viennent pas du pétitionnaire.

Une personne qui a plusieurs rôles produit une ligne d'historique par rôle pour un même changement. Son bloc dans l'accordéon affiche alors un bouton « Vu » par rôle.

Les modifications d'un porteur personne physique sont enregistrées sous `beneficiaire_demarche_numerique.*`, puisque c'est la même fiche. Le bloc du porteur les affiche ; le bloc de l'acteur ne les répète pas.

Une même personne peut apparaître sur deux fiches, par exemple comme personne contact et comme bénéficiaire DN. Comme dans l'ADR-0002, on ne fusionne pas automatiquement.

Supprimer un dossier supprime aussi ses fiches `personne_physique` (porteur et acteurs) qu'aucun autre dossier ne référence. Une fiche laissée sans rôle par une resynchro est gardée.

Les fiches `personne` créées autrefois pour `dossier.deposant` restent en base, sans référence.
