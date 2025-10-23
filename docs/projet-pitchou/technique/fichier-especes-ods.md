# Fichier espèces .ods

Ce document décrit le format du fichier que l'on export sur la page <https://pitchou.beta.gouv.fr/saisie-especes>.


## Contexte et description générale

La plateforme Pitchou permet de gérer la procédure Demande de Dérogations Espèces Protégées (DDEP)
Elle se repose notamment sur un [formulaire Démarches Simplifiées dédié](https://www.demarches-simplifiees.fr/commencer/derogation-especes-protegees)

La DDEP demande notamment au demandeur ou "pétitionnaire" de communiquer la liste des espèces protégées dont il demande une dérogation à déranger. Et pour chaque espèces, des données spécifiques (nombre d'individus, surface, activité, etc.)

Après divers expérimentation, l'équipe Pitchou décide que cette communication aura lieu sous la forme d'un fichier à télécharger


## Description technique

**Version 1.1.0**

### Versionnage

Le versionnage de ce fichier suit [*semantic versionning*](https://semver.org/)

Le morceau majeure est changée quand le parser a besoin d'être modifié pour comprendre la nouvelle version. Celà arrive notamment en cas de changement de nom de feuille ou de colonne

La morceau mineure est changée quand un changement a lieu sur le contenu sans pour autant affecter la validité du parseur de la version majeure
Celà arrive notamment en cas d'ajout d'une colonne dans une feuille

La morceau patch est changé quand quelque chose a changé dans le format de fichier mais ne modifie pas le contenu de fichier
Celà arrive notamment en cas de modification des styles ou l'ajout des règles de validation pour les cellules


### Architecture

Il s'agit d'un fichier tableur [.ods](https://en.wikipedia.org/wiki/OpenDocument)

Ce fichier contient les feuilles suivantes :
- `oiseau` (optionnelle)
- `faune non-oiseau` (optionnelle)
- `flore` (optionnelle)
- `metadata` (obligatoire)

L'ordre des feuilles n'a aucune importance


### Spécificité des feuilles

#### Feuille `metadata`

| Nom de colonne             | Type              | Description                                                    |
|----------------------------|-------------------|----------------------------------------------------------------|
| `version fichier`            | numéro de version | version du fichier ods de liste des espèces                    |
| `version TaxRef`             | numéro de version | version de TaxRef, notamment pour les CD_REF                   |
| `schema rapportage européen` | chaîne de caractères    | URL vers un .xsd pour les codes des activités/méthodes/transports http://dd.eionet.europa.eu/schemas/habides-2.0/derogations.xsd |


#### Feuille `oiseau`

| Nom de colonne          | Type                                                  | Description                                           |
|-------------------------|-------------------------------------------------------|-------------------------------------------------------|
| `noms vernaculaires`      | liste de chaînes de caractère séparé par des virgules |                                                       |
| `noms scientifique`       | liste de chaînes de caractère séparé par des virgules |                                                       |
| `CD_REF`                  | chaînes de caractère                                  | identifiant TaxRef                                    |
| `nombre individus`        | chaînes de caractère                                  | fourchette sous la forme `x-y`. Par exemple, `11-100` |
| `nids`                    | nombre                                                |                                                       |
| `œufs`                    | nombre                                                |                                                       |
| `surface habitat détruit` | nombre                                                | surface en m²                                         |
| `activité`           | chaînes de caractère                                  | description activité selon la nomenclature européenne        |
| `identifiant pitchou activité` | chaînes de caractère | code activité selon la [nomenclature de Pitchou](https://github.com/betagouv/pitchou/raw/refs/heads/main/data/activites-methodes-moyens-de-poursuite.ods) |
| `code activité`           | chaînes de caractère                                  | code activité selon la nomenclature européenne        |
| `méthode`            | chaînes de caractère                                  | description méthode selon la nomenclature européenne         |
| `code méthode`            | chaînes de caractère                                  | code méthode selon la nomenclature européenne         |
| `transport`          | chaînes de caractère                                  | description transport selon la nomenclature européenne       |
| `code transport`          | chaînes de caractère                                  | code transport selon la nomenclature européenne       |


#### Feuille `faune non-oiseau`

| Nom de colonne          | Type                                                  | Description                                           |
|-------------------------|-------------------------------------------------------|-------------------------------------------------------|
| `noms vernaculaires`      | liste de chaînes de caractère séparé par des virgules |                                                       |
| `noms scientifique`       | liste de chaînes de caractère séparé par des virgules |                                                       |
| `CD_REF`                  | chaînes de caractère                                  | identifiant TaxRef                                    |
| `nombre individus`        | chaînes de caractère                                  | fourchette sous la forme `x-y`. Par exemple, `11-100` |
| `surface habitat détruit` | nombre                                                | surface en m²                                         |
| `activité`           | chaînes de caractère                                  | description activité selon la nomenclature européenne        |
| `identifiant pitchou activité` | chaînes de caractère | code activité selon la [nomenclature de Pitchou](https://github.com/betagouv/pitchou/raw/refs/heads/main/data/activites-methodes-moyens-de-poursuite.ods) |
| `code activité`           | chaînes de caractère                                  | code activité selon la nomenclature européenne        |
| `méthode`            | chaînes de caractère                                  | description méthode selon la nomenclature européenne         |
| `code méthode`            | chaînes de caractère                                  | code méthode selon la nomenclature européenne         |
| `transport`          | chaînes de caractère                                  | description transport selon la nomenclature européenne       |
| `code transport`          | chaînes de caractère                                  | code transport selon la nomenclature européenne       |


#### Feuille `flore`

| Nom de colonne          | Type                                                  | Description                                           |
|-------------------------|-------------------------------------------------------|-------------------------------------------------------|
| `noms vernaculaires`      | liste de chaînes de caractère séparé par des virgules |                                                       |
| `noms scientifique`       | liste de chaînes de caractère séparé par des virgules |                                                       |
| `CD_REF`                  | chaînes de caractère                                  | identifiant TaxRef                                    |
| `nombre individus`        | chaînes de caractère                                  | fourchette sous la forme `x-y`. Par exemple, `11-100` |
| `surface habitat détruit` | nombre                                                | surface en m²                                         |
| `activité`           | chaînes de caractère                                  | description activité selon la nomenclature européenne        |
| `identifiant pitchou activité` | chaînes de caractère | code activité selon la [nomenclature de Pitchou](https://github.com/betagouv/pitchou/raw/refs/heads/main/data/activites-methodes-moyens-de-poursuite.ods) |
| `code activité`           | chaînes de caractère                                  | code activité selon la nomenclature européenne        |
