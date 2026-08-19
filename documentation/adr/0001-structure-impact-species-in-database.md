# ADR-0001: Structurer les espèces protégées impactées et leurs impacts en base de donnée

_English version: [0001-structure-impact-species-in-database.en.md](0001-structure-impact-species-in-database.en.md)_

## Statut

Accepté

## Contexte

### Spécification Métier

Chaque demande de dérogation concerne un projet qui impacte des espèces protégées d'une certaine façon.

Un dossier peut impacter une ou plusieurs espèces.

Un dossier peut impacter une ou plusieurs fois la même espèce.

Un impact est défini par un type d'impact et par des critères (Ex : méthode utilisée, moyen de poursuite, surface habitat détruit...).

Les critères applicables dépendent du type d'impact.

« Applicable » signifie ici que le critère a un sens pour ce type d'impact et peut donc être renseigné, sans que sa saisie soit imposée. Par exemple, une destruction de nids et d'œufs se décrit par un nombre de nids et un nombre d'œufs, jamais par une surface d'habitat détruit.

Tous les types d'impacts et les critères sont définis par Pitchou qui se fonde sur HaBiDeS+ (ou Habides 2.0), l'outil de rapport en ligne de l'Union européenne servant à enregistrer les dérogations pour les directives « Oiseaux » et « Habitats » (cf le schéma utilisé pour le rapportage européen http://dd.eionet.europa.eu/schemas/habides-2.0/derogations.xsd).

Aujourd'hui, les descriptions de ces impacts, qu'on appellera des critères, sont renseignées dans des fichiers .ods appelés "fichier espèces impactées".

Ces fichiers sont dans un stockage S3 et l'identifiant de l'objet S3 est contenu dans la colonne `especes_impactees` de la table `dossier`.

Chaque espèce peut être impactée selon un type d'impact, qui peut être décrit selon différents critères, notamment « Méthode » et « Moyen de poursuite » qui dépendent d'un code.

Les types d'impacts (appelés Activité par la Commission européenne et dans l'outil Onagre) et leurs critères sont définis dans le fichier de référence `data/activites-methodes-moyens-de-poursuite.ods`.

### Problème rencontré

Le stockage des données des espèces impactées et de leurs impacts dans des fichiers .ods posent des contraintes :

- Il est difficile de rechercher des dossiers selon les espèces protégées qui sont concernées par le dossier, de filtrer par type d'impact, de faire des agrégats.
- Dès que l'on souhaite afficher les espèces protégées et comment elles sont impactées par un dossier, on doit récupérer le fichier .ods et extraire les données, ce qui est fastidieux.
- Notre processus actuel d'extraction de données du fichier .ods est permissif :
  - Si le CD_REF de l'espèce est inconnu du référentiel, alors notre parseur casse
  - Il est difficile de modifier de manière robuste la structure des données des impacts et de leur qualification (par exemple, si un code d'activité est divisé en plusieurs codes, si un libellé d'activité change...).
- Il est fastidieux pour les administratrices de modifier la spécification métier (ajouter des codes). Elles doivent prévenir l'équipe technique qui devra modifier le fichier `data/activites-methodes-moyens-de-poursuite.ods` et faire les modifications nécessaires dans le parseur.

Pour ces raisons, on souhaite stocker les données des espèces impactées et leurs impacts dans des tables en base de donnée.

La problématique est de savoir comment mettre les critères d'un impact (Méthode, Moyen de poursuite, Nombre de nids...) en base de données, sachant que les critères applicables dépendent du type d'impact.

À noter que les codes des moyens de poursuite proviennent de la directive Oiseau et de la directive Habitat. Il peut y avoir deux moyens de poursuite avec les mêmes codes. Pour caractériser de manière unique un moyen de poursuite, on se fondera sur le doublet (code, classification (dépendant de la directive)).

|                      | **Solution 1**<br>Un JSONB                                                                                                                                                | **Solution 2**<br>Une colonne par critère                                                                                                       | **Solution 3**<br>Séparer les critères dans des tables dédiées                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| ✅ **Avantages**     | - Très simple<br>- Flexible                                                                                                                                               | - Simple à comprendre, à mettre en œuvre et à interroger<br>- Schéma explicite<br>- Typage fort des données<br>- Pas de jointure supplémentaire | - Flexible et évolutive<br>- Schéma explicite                                                                   |
| ❌ **Inconvénients** | - Perte du typage des données<br>- Pas de contrainte sur les champs applicables / non applicables<br>- Agrégations et requêtes plus complexes<br>- Schéma moins explicite | - L'ajout, la suppression ou la modification d'un critère nécessite une évolution du modèle de données                                          | - Augmente la complexité du modèle de données (jointures supplémentaires, validation du type des valeurs, etc.) |

## Décision

Au regard du contexte métier, la solution retenue est **la solution 2 : une colonne par critère**.

En effet, le nombre de critères est limité (6 au maximum) et n'a pas évolué depuis plus de deux ans. Dans ce contexte, un modèle de données simple et explicite est préférable à une solution plus générique.

La solution 3, basée sur des tables dédiées aux critères, apporterait une plus grande flexibilité mais au prix d'une complexité importante (jointures supplémentaires, gestion des différents types de valeurs, validations spécifiques). Cette complexité ne semble pas justifiée au regard du besoin actuel.

On ajoute que l'on souhaite conserver les fichiers espèces originaux. En effet, ces fichiers doivent être créés par les porteurs de projet et ils portent une dimension officielle. Il se peut que ces fichiers ne soient pas correctement remplis (l'espèce protégé n'existe pas dans la base de donnée, un critère qui ne s'applique pas à l'espèce a été rempli...). Dans ce cas, on décide d'afficher ces anomalies dans Pitchou pour en informer les instructrices.

Le modèle retenu est le suivant :

- Une table **`impact_espece`** contenant :
  - les références vers le dossier, l'espèce et le type d'impact ;
  - une colonne dédiée pour chacun des six critères, typée selon la nature de la donnée.
  - une colonne `source_file` faisant référence au fichier espèce originale s'il existe
  - une colonne permettant de savoir quand le fichier a été créé/modifié

- Une table **`impact_type`** décrivant les différents types d'impact :
  - code Pitchou (clé primaire) ;
  - code européen ;
  - libellé Pitchou ;
  - libellé européen ;
  - classification ;
  - la liste des libellés d'activités Onagre qui correspondent à ce type d'impact ;
  - un booléen par critère indiquant si le critère est applicable à ce type d'impact (`critere_methode`, `critere_moyen_de_poursuite`, `critere_nombre_individus`, `critere_nids`, `critere_oeufs`, `critere_surface_habitat_detruit`).

- Une table **`impact_methode`** décrivant les différentes méthodes :
  - identifiant ;
  - code européen (clé primaire) ;
  - libellé Pitchou ;
  - libellé européen ;
  - classification.

- Une table **`impact_moyen_de_poursuite`** décrivant les différents moyens de poursuite :
  - code européen et classification (clé primaire composée) ;
  - libellé Pitchou ;
  - libellé européen.

Ces trois tables sont la source unique de la spécification : rien de ce qu'elles contiennent n'est dupliqué dans le code. Le formulaire de saisie détermine les critères à afficher en lisant les booléens de `impact_type`, et les listes déroulantes « méthode » et « moyen de poursuite » sont alimentées depuis leurs tables respectives.

## Conséquences

Les colonnes correspondant aux critères ne pourront pas être déclarées `NOT NULL` en base de données, puisqu'elles ne s'appliquent pas à tous les types d'impact. La cohérence des données, à savoir l'absence de valeur pour les critères non applicables au type d'impact, devra donc être garantie par l'application.

La spécification devient de la donnée. Modifier les critères applicables à un type d'impact, corriger un libellé ou ajouter un type d'impact ne demande plus de livrer une nouvelle version de l'application : ce sont des écritures en base. En revanche, ajouter un critère qui n'existe pas encore reste un changement de schéma et de code, puisqu'il faut une colonne dans `impact_espece`, une colonne d'applicabilité dans `impact_type` et un composant de saisie.

Si ces évolutions de critères devenaient fréquentes, il serait pertinent de réévaluer ce choix et d'envisager une solution plus générique, basée sur des tables dédiées aux critères (solution 3).

Le fichier `data/activites-methodes-moyens-de-poursuite.ods` n'aura plus vocation à être utilisé et sera supprimé. Les spécifications qu'il contient seront reprises dans les trois tables, où elles resteront consultables.

Si le fichier original est supprimé, cela supprime les lignes concernées dans la table `impact_espece`.
