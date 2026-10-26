# Experimental mapping profile v2

The owner requested a first importer increment using validated correspondences, followed by representative dossier tests. This profile adds the transformations below. It does not change correspondence statuses or approve shared rules.

| Source                                                 | Target                                                 | Implemented behavior                                                                                                                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projet.objetid` → `objet`                             | `dossier.main_activite`                                | Use one validated reference choice with a structured `activity_code`. Store its canonical Pitchou label only when `activite_label` resolves that label to the same code without review. |
| `demandes.motifderogationid` → `motifderogation`       | `dossier.motif_derogation`                             | Require both the validated field rule and one of the 69 implemented validated reference choices. Store the exact current motif option.                                                  |
| `demandes.lieux`                                       | `dossier.description`                                  | Preserve the text under `Lieux des opérations, Onagre`.                                                                                                                                 |
| `demandes.periodes`                                    | `dossier.description`                                  | Preserve the text under `Périodes souhaitées, Onagre`. Do not parse it as dates.                                                                                                        |
| `projet.servicecoordinateurid` → `services.nomservice` | `dossier.description`                                  | Preserve the service name under `Service coordinateur du projet, Onagre`. This does not assign a group.                                                                                 |
| `demandes.solutionsalternatives`                       | `dossier.no_other_satisfactory_solution_justification` | Copy the text, including whitespace and line breaks. Do not infer a boolean assertion.                                                                                                  |
| `demandes.datereception`                               | `dossier.depot_date`                                   | Retain the v1 experimental civil-date convention, midnight UTC. Missing or invalid values block creation.                                                                               |

Descriptions use the table order above, with a blank line between sections. Blank source values create no section. This assembly format remains experimental while the shared description rule awaits validation. No existing description is rewritten.

Activities use individually validated object-reference decisions. The general `projet.objetid` discussion does not authorize an ambiguous object. A missing or competing validated choice leaves the activity absent and produces an explicit omission. Renewable energy subtypes and the inventory/scientific distinction remain unresolved.

The motif choices are explicit source IDs grouped by current Pitchou option in `import/decisions.ts`. The original workbook binds mapping keys to source IDs. A workbook row number is never used as an Onagre identifier. Reference labels must still match the reviewed workbook. New or changed labels require review.

## Gates and provenance

Each implemented mapping must be `validated`, have the expected target and retain the supported rule. Changing the prose does not generate a new transformation. A different rule, unvalidated decision or unsupported reference produces a per-record omission. A required linked source row that is missing or duplicated blocks the record. Snapshot references are read from the complete source rows, not the three examples.

An eligible dossier can still be incomplete. `ready` means this experimental profile can create it, not that its full migration is settled. Preview and saved reports show additional target values, source columns, mapping keys and versions, plus omissions. The raw references and plan are also stored with the identity ledger.

Linked-reference changes participate in source hashing. Activity catalogue changes invalidate previews and background-job contexts. Mapping changes that alter a previously applied plan cause a conflict on a fresh preview. Target edits, earlier profiles and legacy code matches also remain conflicts. No update or automatic adoption is implemented. Missing source rows never delete targets.

## Deferred decisions

- Comments need an author and historical-date policy. No comments are created, even for validated comment destinations.
- Phase chronology remains unresolved. No reception phase, signed decision or later phase is fabricated. Signature dates remain in the source until decision creation is implemented.
- One demande per dossier remains the trial unit. Two demandes sharing a project create distinct dossiers and repeat common project data.
- Services-to-groups, people, species conversion, structured geography and attachment bytes remain outside this profile.

## Verification

`verify-import.ts` uses a new disposable local database. In addition to the existing replay, concurrency, rollback and background-job checks, it verifies exact mapped values, multiline text, source-ID resolution, shared projects, missing dates, ambiguous activities, existing targets, catalogue changes, reference-only changes, edited rules, edited targets and v1 identity conflicts. It checks that phase, relation and notification tables remain unchanged.

The 26 October 2026 read-only analysis of the local original dump covered all 22,069 demandes. Planned fields existed for 18,730 activities, 13,633 motifs, 22,069 descriptions and 3,219 solutions-alternatives texts. A description can consist solely of the coordinator name. These are field-coverage counts, including blocked records, not counts of fully migratable dossiers.

A separate disposable test copied six real demandes, including a shared project, an unresolved activity and a missing reception date. Five dossiers were created, one was blocked, and a repeated import created zero extra dossiers. No phase events or outbox entries were created. The test database was dropped afterward.
