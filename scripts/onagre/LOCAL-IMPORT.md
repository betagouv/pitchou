# Local JSON dossier review

`local-import.mjs` imports JSON proposals into the existing development database without resetting it. It accepts only `NODE_ENV=development`, the `dev` database user and `localhost:5434/especes_pro_3731` or `127.0.0.1:5434/especes_pro_3731`. It rejects staging and connection-string overrides. This is a local review tool, not the production migration runner.

Run from the repository root with an existing local instructeur email and explicit sample files:

```sh
node --env-file=.env scripts/onagre/local-import.mjs reviewer@example.test .fleet/onagre/migration/dossiers/example.json
node --env-file=.env scripts/onagre/local-import.mjs --apply reviewer@example.test .fleet/onagre/migration/dossiers/example.json
```

Without `--apply`, the transaction rolls back. PostgreSQL sequences can still advance during a dry run. With `--apply`, all selected dossiers commit together. `ONAGRE_LOCAL_REPORT` optionally writes a private JSON report; point it inside the ignored workspace.

The input contains `identity`, `proposal.dossier` and optional `proposal.records`. Each related record has a stable `sourceKey`, a supported `table` and `values`. Prescriptions also specify an earlier decision's `parentSourceKey`. The importer validates an allowlist of tables and columns. It reads prepared values, never interprets mapping prose or calls an LLM.

`main_activite` accepts an existing Pitchou activity code or reviewed label. The importer resolves it against the target database's activity referentiel and stores its canonical label, as Pitchou expects. Unknown or ambiguous activities stop the import; it never creates a new activity.

Supported related tables are `decision_administrative`, `prescription`, `avis_expert`, `commentaire` and `evenement_phase_dossier`. Optional `proposal.speciesImpacts` entries populate the existing species impact table and its required source spreadsheet. Original attachments, people and production service routing remain outside this local importer. Draft proposals are accepted for local review. Approval statuses do not authorize production writes.

Migration constraint: adding a database field, UI field or other extension to Pitchou requires the owner's explicit prior consent. A missing destination for an Onagre value does not authorize extending Pitchou. First consider existing fields, comments or retaining the value only in the private source archive.

Straightforward mappings and mappings already validated by the team may be implemented directly in existing destinations. For ambiguous mappings, present a recommendation and obtain the owner's decision before importing. Original Onagre attachment binaries are pending delivery from the Onagre team; metadata alone must not be presented as an available file.

Owner feedback on a sample applies to every applicable sample and to future preparation. Apply shared rules with `prepare-fields.mjs`, refresh all sample JSON proposals, then reimport the review set. Report missing source values separately from mappings awaiting a decision or not yet implemented. Never infer a dossier's location from `projet.communesid`, which may be the applicant's address. Using explicit project-location links as a fallback requires an owner decision.

For projects with several demandes, prefix each title with `1 - `, `2 - `, etc., ordered by numeric Onagre demande ID across the complete source project, including demandes not yet imported. Pass the complete `relatedDemandes` list to preparation. Single-demande projects keep their original title. Always derive titles from the original source name so repeated preparation cannot accumulate prefixes.

## Repeat imports

`prepare-species.mjs` resolves source TAXREF identifiers only when the current protected-species reference also recognizes the source scientific name, including synonyms. Impact types must match an existing Onagre label and the resolved classification. Unknown references and quantities awaiting a rule remain in the private review report. Zero source quantities are not interpreted as confirmed zeroes. The owner-approved motor-vehicle correspondence is enabled explicitly with `motorVehicleNonBird`; it applies only to non-bird impacts allowing a pursuit criterion. Source methods without an applicable destination remain available for labelled comments.

Each species entry has a stable `sourceKey` derived from its source description and activity, and explicit nullable `values`. The importer validates references again against the local database. It generates an XLSX with a provenance sheet and a filename identifying it as generated from Onagre. This is not an original Onagre attachment. Pitchou's existing download button still calls it the original file; the comment and downloaded workbook explain its actual origin.

The generated workbook uses a content hash in its import identity. A changed workbook creates an immutable file version while updating the existing impact IDs and dossier pointer. Only `--apply` uploads bytes, exclusively to local storage on port 9000 in `pitchou-dev`, after all database checks and before commit. A failed commit can leave an unused local object; it cannot replace the previous workbook. Missing objects can be restored by rerunning. No general attachment import is enabled.

Species imports reject replaced attachments, edited or unowned impacts, and removed impact identities until explicitly reconciled, preventing the spreadsheet and impact table from diverging. This is stricter than ordinary fields, whose unchanged proposals preserve local edits. Old generated file versions remain retained.

A private `onagre_local_import.identity` table records each dossier/source identity, target ID and previous imported values in the same transaction as the business records.

- An unchanged proposal reuses the existing dossier and child IDs.
- A changed proposal updates fields that have not been edited locally.
- An unchanged proposal preserves local edits.
- Conflicting changes stop and roll back the entire selected batch.
- A missing managed field is rejected. Use an explicit null to clear it.
- Related records removed from the JSON are retained and listed in the report. No implicit deletions occur.
- Deleted or reassigned imported records require explicit resolution. Existing unowned dossiers with the same Onagre code are not automatically adopted.

For local review, the importer assigns dossiers to an existing active group of the specified reviewer and follows them. This is not a production service mapping. Group-arrival notification baselining suppresses new group-arrival emails. No mail delivery or synchronization workers are started.

Pitchou's existing database triggers also route dossiers by `primary_department` through `groupe_departement` to active groups. This is the first routing source for Onagre, using the dossier location prepared from the demande or an approved explicit project-location fallback. Linked Onagre services are a last resort and do not override a resolved department. Keep the coordinating service's description separate from access routing. When department routing cannot resolve a responsible group, review the source services and available groups before proposing a new group such as DGALN. Creating a group alone does not implement an exception: the current routing refresh can remove direct assignments that do not match department coverage. Any such extension needs an explicit owner decision.

Comments without source dates retain an explicit note in their prepared content; the database creation date is the import date. Historical phase timestamps are explicit proposals and must be reviewed with their evidence.

## Validation

```sh
node --test scripts/onagre/local-import/merge.test.mjs
node --env-file=.env scripts/onagre/local-import/verify.mjs
node --test scripts/onagre/prepare-fields.test.mjs scripts/onagre/prepare-species.test.mjs
node --env-file=.env --import tsx scripts/onagre/local-import/verify-species.mjs
```

The second command exercises the actual local PostgreSQL schema using synthetic records, then rolls back. It checks replay, changes, stable IDs, local edits, conflicts, retained removals and refusal to adopt existing dossiers.

The species verification also rolls back and never uploads files. It checks workbook roundtrip through Pitchou's native reader, immutable file versions, impact updates, reference validation and refusal of local edits or removed impacts. The native spreadsheet reader represents a blank individual count as an empty string; the migration stores SQL NULL for the same unspecified quantity.

Keep all real sample JSON, mapping exports, screenshots, backups and reports in the ignored `.fleet` workspace. Only reusable code, synthetic tests and this documentation belong in Git.
