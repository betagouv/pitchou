# Local JSON dossier review

## Current project and demande model

The migration branch now includes the unfinished `feat/dossier-demandes-captures` feature. This is a development dependency, not acceptance of the UI or authorization to merge or deploy it. Further generic feature improvements should stay on that feature branch and be merged into this branch as needed.

The owner-approved target is one Pitchou dossier per Onagre project, containing independently editable demandes. Access is shared across the dossier; every subsequent business change is recorded for historical consultation and comparison. Historical Onagre demandes are separate demandes, not reconstructed revisions of one demande.

The local importer accepts version 2 project files: `identity` identifies the Onagre `projet`, `proposal.name` is its shared title, and `demandes` contains the independently prepared demandes. Each demande retains its version 1 identity, source rows, evidence, mapping decisions, issues and related records, plus a `label` for the selector. Its `proposal.dossier` no longer contains `name`: the importer derives that from the project title. Selector labels use the original Onagre code followed by the prepared location. `omittedDemandes` lists known siblings outside the prepared sample set; it does not authorize their import or deletion.

See [the structural schema](project.schema.json). `validateProjects` additionally verifies cross-project identities, duplicate demands, prepared records and the existing field/reference allowlists before writing. Keep the original version 1 files. The conversion command writes new files and refuses to overwrite an existing project:

```sh
node scripts/onagre/group-projects.mjs .fleet/onagre/migration/projects .fleet/onagre/migration/dossiers/example.json
```

Review edits now belong in the project files. To rerun legacy preparation helpers, generate a new candidate directory and reconcile its changes with those reviewed project files. Do not regenerate over manual decisions or reset the database. The original team-rule snapshots remain intact; the project file records the owner's later grouping decision as an explicit override.

## Compatibility after the group-assignment merge

The importer now uses the shared application routing and access services in the same Knex transaction as its prepared SQL writes. It acquires the access lock before resolving the reviewer, groups all selected demandes, shares their direct grants and calls `recalculateAssignments` with `silent: true` after the complete batch. It neither calls the removed `pitchou_can_instruct` function nor writes effective group edges directly.

Existing group rules and overrides determine the assignment. A direct instruction grant and personal follow are seeded for the explicitly supplied local reviewer, separately from the production correspondence. Replay preserves unfollows and refuses to recreate a changed or revoked review grant. Explicit group overrides and human edits are retained. See [the transaction contract](../../documentation/application-routing.md). Ask the owner about unresolved mapping or selection decisions.

Local databases that applied an intermediate version of the assignment branch may have a different schema despite recording similarly named migrations. Check migration history and actual tables before running migrations; a successful code merge does not upgrade the database.

## Run locally

`local-import.mjs` imports JSON proposals into the existing development database without resetting it. It accepts only `NODE_ENV=development`, the `dev` database user and `localhost:5434/especes_pro_3731` or `127.0.0.1:5434/especes_pro_3731`. It rejects staging and connection-string overrides. This is a local review tool, not the production migration runner.

Run from the repository root with an existing local instructeur email and explicit sample files:

```sh
node --env-file=.env --import tsx scripts/onagre/local-import.mjs reviewer@example.test .fleet/onagre/migration/projects/example.json
node --env-file=.env --import tsx scripts/onagre/local-import.mjs --apply reviewer@example.test .fleet/onagre/migration/projects/example.json
```

Without `--apply`, the transaction rolls back. PostgreSQL sequences can still advance during a dry run. With `--apply`, all selected dossiers commit together. `ONAGRE_LOCAL_REPORT` optionally writes a private JSON report; point it inside the ignored workspace.

Within each demande, `proposal.dossier` contains prepared business fields and `proposal.records` contains related records. Each related record has a stable `sourceKey`, a supported `table` and `values`. Prescriptions also specify an earlier decision's `parentSourceKey`. The importer validates an allowlist of tables and columns. It reads prepared values, never interprets mapping prose or calls an LLM. Reports include both the project UUID and each demande's existing-style dossier ID.

`main_activite` accepts an existing Pitchou activity code or reviewed label. The importer resolves it against the target database's activity referentiel and stores its canonical label, as Pitchou expects. Unknown or ambiguous activities stop the import; it never creates a new activity.

Supported related tables are `decision_administrative`, `prescription`, `avis_expert`, `commentaire` and `evenement_phase_dossier`. Optional `proposal.speciesImpacts` entries populate the existing species impact table and its required source spreadsheet. Prepared porteurs and contacts use the dedicated structures below. Original attachments and production service routing remain outside this local importer. Draft proposals are accepted for local review. Approval statuses do not authorize production writes.

Migration constraint: adding a database field, UI field or other extension to Pitchou requires the owner's explicit prior consent. A missing destination for an Onagre value does not authorize extending Pitchou. First consider existing fields, comments or retaining the value only in the private source archive.

Ask the owner about general mapping questions first: they may already know the answer. Add a question to the admin migration workspace's **Questions à l’équipe** tab (`/onagre?tab=questions`) only with their explicit agreement. Include the source meaning, concrete examples, candidate destinations and any temporary exclusion. Questions and their edit history are persisted separately from business dossiers and included in the decisions export. An answer in that tab does not automatically approve a mapping or execute an import: reconcile the answer with the reviewed project proposals first. Keep real examples in the database/private workspace, never in committed seed data.

Straightforward mappings and mappings already validated by the team may be implemented directly in existing destinations. Ask the owner to resolve general ambiguities, not each individual match: apply agreed rules on a best-effort basis and retain case-specific evidence and uncertainty privately. Original Onagre attachment binaries are pending delivery from the Onagre team; metadata alone must not be presented as an available file.

## Porteurs and contacts

Prepare identities by reading all relevant source columns together. Name fields can contain organisations or functions; `precisionpetitionnaire` and addresses can identify the actual organisation. Use the team's validated fallback from unusable `nompersonne`/`prenompersonne` to `nomcoordinateur`, and from empty `adressemailchefprojet` to `adressemailpetitionnaire`, after checking that the details belong to the chosen person. Do not mechanically concatenate conflicting identities. Empty values and placeholders such as `0` are not identities. Keep the choice, source fields and alternatives in each private JSON's decisions. The SQL importer consumes prepared identities; it does not guess from raw source columns.

The owner approved importing identifiable people as `personne_contact`, without accounts or access rights. `personneshabilitees` remains excluded, including from comments. A porteur may be a person or an organisation; the source category and contextual evidence determine which.

- `proposal.contacts` is an optional array of `{ sourceKey, values }`. Each stable source key identifies a prepared person within that demande. Values explicitly contain `first_names`, `last_name`, `email`, `address`, `phone`, `role`, with null for absent data. These create `personne_physique` and `dossier_acteur` records. Identical names across demandes are not automatically merged.
- `proposal.porteur` is optional, or null to clear an imported porteur. For `type: "personne_physique"`, `values` uses the same person fields. For `type: "personne_morale"`, provide `siret`, `values` (`legal_name`, `address`, `postal_code`, `insee_code`, explicitly nullable), and `verification: { status: "verified", reason, sources: [httpsUrl] }`.
- For an organisation without a verified SIRET, use `type: "organisation"` and `values: { name, address, siren, verification_status, source, source_reference, verification_evidence }`. All seven fields are required, with explicit nulls for absent nullable values. `name`, `source` and `source_reference` must be nonblank. A `source_declared` organisation must have null `siren` and null `verification_evidence`. A `verified` organisation requires nonblank evidence and may have a verified nine-digit SIREN. A SIREN candidate does not establish verification. Each demande owns its organisation identity, even when another demande has the same name or SIREN.
- Research SIRETs using reliable organisation and establishment evidence, including historical addresses. Do not substitute the current headquarters for a verified historical establishment. Cache registry results and evidence privately for reuse across projects. Keep declarations, missing and ambiguous identifiers explicit in the private preparation decisions. Once a SIRET is verified, replace the prepared organisation porteur with `type: "personne_morale"` and its establishment evidence. Replay replaces the imported porteur relationship and retains the former organisation record and provenance. Sample success is not a full-dump coverage estimate.
- The same SIRET reuses the canonical porteur. Existing unowned enterprises are reused without changing their metadata. Importer-owned enterprises, organisations and people use three-way field reconciliation, preserving local edits and rejecting conflicts. A manually replaced porteur survives unchanged replay. Deleted/reassigned contact links, changed porteur relationships and newly shared imported people or organisations require reconciliation. Removing a contact from a JSON retains it and reports it, rather than silently deleting it.

No new business tables, UI fields or account privileges are introduced by this mapping.

Owner feedback on a sample applies to every applicable sample and to future preparation. Apply shared rules with `prepare-fields.mjs`, refresh all sample JSON proposals, then reimport the review set. Report missing source values separately from mappings awaiting a decision or not yet implemented. Never infer a dossier's location from `projet.communesid`, which may be the applicant's address. Using explicit project-location links as a fallback requires an owner decision.

Demande selector labels use `Onagre code — location`: commune names with department codes when known, otherwise department names and codes, or the code alone when no location is known. Only prepared project locations are used, never applicant addresses. Missing Onagre references require review. Long commune lists fall back to departments to fit the existing label field. This owner decision supersedes the earlier numbered-project-title labels. The original reference also remains in `onagre_demande_identifier`; source IDs still determine import identity because codes can be reused.

## Repeat imports

`prepare-species.mjs` resolves source TAXREF identifiers only when the current protected-species reference also recognizes the source scientific name, including synonyms. Impact types must match an existing Onagre label and the resolved classification. An explicit `impactTypeBySourceKey` choice can select among those candidates. When contextual source evidence clarifies a generic activity, `activityInterpretationBySourceKey` can supply the interpreted label together with a reason and source evidence references. Store these decisions in the private JSON and preserve the raw source unchanged; a scientific purpose alone does not establish immediate release. Unresolved taxa remain in the private review report and are also preserved in Onagre-labelled comments with their original scientific name and activity labels, including broader taxonomic groups and taxa absent from the current catalogue. These comments do not create a structured impact, substitute a species, or imply a protection status. Positive description counts are assigned once, only to a single impact allowing the same unit, with no unknown competing impact or conflicting/missing linked result. Ambiguous counts, zeros, ranges and surface components remain in Onagre-labelled comments and the private review report; results are labelled separately. Specimens are never converted to eggs, and shared capture/release counts are never duplicated. The owner-approved motor-vehicle correspondence is enabled explicitly with `motorVehicleNonBird`; it applies only to non-bird impacts allowing a pursuit criterion. Source methods without an applicable destination remain available for labelled comments. Species notes and male/female counts are preserved as labelled source comments even when the taxon cannot be matched; they do not create a structured impact or a total quantity.

When the species is verified but the impact type is ambiguous, unknown or absent, prepare `impact_type: null`. Pitchou already displays these rows under “Type d’impact non renseigné”. Leave type-dependent criteria empty and retain the source activity and unresolved choice in the private JSON. An unresolved species identity remains excluded until it can be matched reliably.

Each species entry has a stable `sourceKey` derived from its source description and activity, and explicit nullable `values`. A description with no activity link uses `activites:unspecified`; do not invent a source activity ID. Resolving the type for an existing source activity updates the same impact identity. Adding source activity links to a previously unlinked description requires reconciling the old unspecified identity, like other removed impact identities. The importer validates references again against the local database. It generates an XLSX with a provenance sheet and a filename identifying it as generated from Onagre. This is not an original Onagre attachment. Pitchou's existing download button still calls it the original file; the comment and downloaded workbook explain its actual origin.

The generated workbook uses a content hash in its import identity. A changed workbook creates an immutable file version while updating the existing impact IDs and dossier pointer. Only `--apply` uploads bytes, exclusively to local storage on port 9000 in `pitchou-dev`, after all database checks and before commit. A failed commit can leave an unused local object; it cannot replace the previous workbook. Missing objects can be restored by rerunning. No general attachment import is enabled.

Species imports reject replaced attachments, edited or unowned impacts, and removed impact identities until explicitly reconciled, preventing the spreadsheet and impact table from diverging. This is stricter than ordinary fields, whose unchanged proposals preserve local edits. Old generated file versions remain retained.

A private `onagre_local_import.identity` table records project, demande, membership, local review grant and child identities, target IDs and previous imported values in the same transaction as the business records. Demande and child keys remain unchanged from version 1, so grouping existing owned imports does not require recreating them. Existing unowned group memberships are rejected.

- An unchanged proposal reuses the existing dossier and child IDs.
- A changed proposal updates fields that have not been edited locally.
- An unchanged proposal preserves local edits.
- Conflicting changes stop and roll back the entire selected batch.
- A missing managed field is rejected. Use an explicit null to clear it.
- Related records removed from the JSON are retained and listed in the report. No implicit deletions occur.
- A demande omitted from a later project file keeps its data and membership. Changed or deleted memberships require explicit reconciliation.
- Deleted or reassigned imported records require explicit resolution. Existing unowned dossiers with the same Onagre code are not automatically adopted.

Imports establish notification baselines without queuing arrival emails. No mail delivery or synchronization workers are started. Each complete imported demande receives one historical state at commit; unchanged replay creates no new historical state. Source phase events remain business data inside that baseline, not fabricated past revisions.

If the development database was reset while the private identity schema survived, do not bypass missing-target checks. Back up the current database and archive the ledger, verify that its target dossiers are absent, then explicitly reconcile those stale entries. Likewise, missing target species references must be restored from a known reference source or left for review; the importer never invents them.

Pitchou now supports automatic rules using primary department, project communes and activity, plus persistent manual inclusions/exclusions and read/instruct access levels. All matching active groups can receive a dossier. Use the shared application routing service instead of writing effective group edges directly. For Onagre, the agreed department-first correspondence remains the starting point; linked services are a last resort, and the coordinating service’s description is separate from access routing. A group such as DGALN can now receive approved manual exceptions without requiring department-wide coverage.

Comments without source dates retain an explicit note in their prepared content; the database creation date is the import date. Historical phase timestamps require reliable source evidence; otherwise prepare `timestamp: null`. The UI displays “Date inconnue”. An internal, database-generated `recorded_at` orders undated events so subsequent phase changes can supersede them; it is never displayed as the historical transition date. Reimport preserves this recording timestamp and can update the historical date when reliable evidence becomes available.

## Validation

`prepare-organisations.mjs` prepares source-declared organisations from explicit source names, with no inferred SIREN or SIRET. It conservatively holds contact names, representatives, generic labels, compound names and ownership comments for review. A held name is not evidence of an invalid organisation: compound legal names can be legitimate. Review proposals against the project and every demande before application; a project owner must not silently replace a demande-specific beneficiary. Keep declared, verified-organisation and verified-SIRET counts separate.

```sh
node --test scripts/onagre/prepare-organisations.test.mjs
node --test scripts/onagre/local-import/merge.test.mjs scripts/onagre/local-import/projects.test.mjs
node --test scripts/onagre/local-import/actors.test.mjs
node --import tsx scripts/onagre/local-import/verify-actors.mjs --disposable
node --env-file=.env --import tsx scripts/onagre/local-import/verify-actors.mjs reviewer@example.test
node --env-file=.env --import tsx scripts/onagre/local-import/verify.mjs reviewer@example.test
node --env-file=.env --import tsx scripts/onagre/local-import/verify-projects.mjs reviewer@example.test
node --test scripts/onagre/prepare-fields.test.mjs scripts/onagre/prepare-species.test.mjs
node --env-file=.env --import tsx scripts/onagre/local-import/verify-species.mjs reviewer@example.test
```

The database verification scripts use synthetic records and roll back. They check replay, changes, stable IDs, local edits, conflicts, retained removals, refusal to adopt existing dossiers, shared group routing, silent notifications, explicit exclusions and preservation of unfollows and reviewer-grant revocations.

`verify-actors.mjs --disposable` creates a random database on the test PostgreSQL server, runs all migrations, seeds a synthetic reviewer, and drops the database after verification. It uses `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER` and `TEST_DB_PASSWORD`, with the same defaults as the application integration tests. It checks declared and verified organisations, isolation despite matching names or SIRENs, ownership and local-edit protection, and an upgrade to a verified SIRET that retains contacts and former organisation provenance. It does not use the development database or change the public importer's target restrictions.

The species verification also rolls back and never uploads files. It checks workbook roundtrip through Pitchou's native reader, immutable file versions, impact updates, reference validation and refusal of local edits or removed impacts. The native spreadsheet reader represents a blank individual count as an empty string; the migration stores SQL NULL for the same unspecified quantity.

Keep all real sample JSON, mapping exports, screenshots, backups and reports in the ignored `.fleet` workspace. Only reusable code, synthetic tests and this documentation belong in Git.

Projects with no source demande can use one explicitly labelled initial demande. Its
identity is `onagre-national:projet:<project ID>:initial-demande`, with
`sourceTable: "projet"`. Source rows must contain the real project and an empty
`demandes` list; related and omitted demandes must also be empty. The label starts
with `Demande initiale — projet Onagre sans demande`. Its Onagre demande reference
is an empty string (the existing database convention), and its DDEP date is null. No decisions, phase events or species impacts are invented.
This case does not apply to projects whose source demandes were all cancelled.
