# ADR-0001: Structure impacted protected species and their impacts in the database (translated with Claude Code)

_Version française : [0001-structure-impact-species-in-database.md](0001-structure-impact-species-in-database.md)_

## Status

Accepted

## Context

### Business specification

Every derogation request concerns a project that impacts protected species in a certain way.

A dossier can impact one or several species.

A dossier can impact the same species one or several times.

An impact is defined by an impact type and by criteria (e.g. method used, means of capture, area of habitat destroyed...).

The applicable criteria depend on the impact type.

"Applicable" here means that the criterion is meaningful for that impact type and can therefore be filled in, without its entry being mandatory. For instance, the destruction of nests and eggs is described by a number of nests and a number of eggs, never by an area of habitat destroyed.

All impact types and criteria are defined by Pitchou, which relies on HaBiDeS+ (or Habides 2.0), the European Union's online reporting tool used to record derogations for the "Birds" and "Habitats" directives (see the schema used for European reporting http://dd.eionet.europa.eu/schemas/habides-2.0/derogations.xsd).

Today, the descriptions of these impacts — which we call criteria — are filled in in .ods files called "fichier espèces impactées".

These files are stored in an S3 storage and the identifier of the S3 object is held in the `especes_impactees` column of the `dossier` table.

Each species can be impacted according to an impact type, which can be described by different criteria, in particular "Méthode" and "Moyen de poursuite", which both depend on a code.

Impact types (called Activité by the European Commission and in the Onagre tool) and their criteria are defined in the reference file `data/activites-methodes-moyens-de-poursuite.ods`.

### Problem encountered

Storing the data of impacted species and of their impacts in .ods files comes with constraints:

- It is difficult to search for dossiers by the protected species they concern, to filter by impact type, or to compute aggregates.
- As soon as we want to display protected species and how they are impacted by a dossier, we have to fetch the .ods file and extract the data, which is tedious.
- Our current extraction process from the .ods file is permissive:
  - If the CD_REF of the species is unknown to the reference dataset, our parser breaks.
  - It is difficult to change the structure of impact data and of its qualification in a robust way (for example, if an activity code is split into several codes, or if an activity label changes...).
- It is tedious for administrators to change the business specification (adding codes). They have to notify the technical team, who then has to modify the `data/activites-methodes-moyens-de-poursuite.ods` file and make the necessary changes in the parser.

For these reasons, we want to store the data of impacted species and of their impacts in database tables.

The question is how to put the criteria of an impact (Méthode, Moyen de poursuite, Nombre de nids...) in the database, knowing that the applicable criteria depend on the impact type.

Note that the codes of the moyens de poursuite come from the Birds directive and from the Habitats directive. Two moyens de poursuite may share the same code. To identify a moyen de poursuite uniquely, we rely on the pair (code, classification (which depends on the directive)).

|                   | **Option 1**<br>A single JSONB                                                                                                                      | **Option 2**<br>One column per criterion                                                                          | **Option 3**<br>Separate criteria into dedicated tables                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| ✅ **Advantages** | - Very simple<br>- Flexible                                                                                                                         | - Simple to understand, to implement and to query<br>- Explicit schema<br>- Strong data typing<br>- No extra join | - Flexible and scalable<br>- Explicit schema                                                |
| ❌ **Drawbacks**  | - Loss of data typing<br>- No constraint on applicable / non-applicable fields<br>- More complex aggregations and queries<br>- Less explicit schema | - Adding, removing or changing a criterion requires a change to the data model                                    | - Increases the complexity of the data model (extra joins, validation of value types, etc.) |

## Decision

Given the business context, the option we retain is **option 2: one column per criterion**.

Indeed, the number of criteria is limited (6 at most) and has not changed in more than two years. In this context, a simple and explicit data model is preferable to a more generic solution.

Option 3, based on tables dedicated to criteria, would bring greater flexibility but at the cost of significant complexity (extra joins, handling of the different value types, specific validations). That complexity does not appear justified given the current need.

We add that we want to keep the original fichiers espèces. These files have to be created by the porteurs de projet and they carry an official dimension. It may happen that these files are not filled in correctly (the protected species does not exist in the database, a criterion that does not apply to the species has been filled in...). In that case, we decide to display these anomalies in Pitchou to inform the instructrices.

The model we retain is the following:

- An **`impact_espece`** table containing:
  - the references to the dossier, the species and the impact type;
  - one dedicated column for each of the six criteria, typed according to the nature of the data;
  - a `source_file` column referring to the original fichier espèce, if there is one;
  - a column recording when the file was created/modified.

- An **`impact_type`** table describing the different impact types:
  - Pitchou code (primary key);
  - European code;
  - Pitchou label;
  - European label;
  - classification;
  - the list of Onagre activity labels that correspond to this impact type;
  - one boolean per criterion indicating whether the criterion is applicable to this impact type (`critere_methode`, `critere_moyen_de_poursuite`, `critere_nombre_individus`, `critere_nids`, `critere_oeufs`, `critere_surface_habitat_detruit`).

- An **`impact_methode`** table describing the different methods:
  - identifier;
  - European code (primary key);
  - Pitchou label;
  - European label;
  - classification.

- An **`impact_moyen_de_poursuite`** table describing the different moyens de poursuite:
  - European code and classification (composite primary key);
  - Pitchou label;
  - European label.

These three tables are the single source of the specification: nothing they contain is duplicated in the code. The data entry form decides which criteria to display by reading the booleans of `impact_type`, and the "méthode" and "moyen de poursuite" dropdowns are populated from their respective tables.

## Consequences

The columns corresponding to the criteria cannot be declared `NOT NULL` in the database, since they do not apply to every impact type. Data consistency — namely the absence of a value for criteria that are not applicable to the impact type — therefore has to be guaranteed by the application.

The specification becomes data. Changing the criteria applicable to an impact type, fixing a label or adding an impact type no longer requires shipping a new version of the application: these are database writes. Adding a criterion that does not exist yet, on the other hand, remains a schema and code change, since it requires a column in `impact_espece`, an applicability column in `impact_type` and a data entry component.

If such changes to criteria were to become frequent, it would be worth reassessing this choice and considering a more generic solution, based on tables dedicated to criteria (option 3).

The `data/activites-methodes-moyens-de-poursuite.ods` file no longer has a purpose and will be deleted. The specifications it contains will be carried over into the three tables, where they will remain available for consultation.

If the original file is deleted, this deletes the corresponding rows in the `impact_espece` table.
