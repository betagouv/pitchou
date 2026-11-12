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

## Reconcile existing records before importing

An existing Pitchou record may have come through Démarche Numérique and still represent an Onagre demande. Its `source` value is not proof that it is safe to import again. The reference can contain a demande code, a project code, several codes, surrounding text or typographical differences.

Generate a read-only report against the pinned local development database:

```sh
node --env-file=.env --import tsx scripts/onagre/reconcile.mjs \
  .fleet/onagre/migration/full/projects .fleet/onagre/reconciliation.json
```

The command validates prepared projects and writes private JSON and CSV reports. Empty projects are explicitly listed as skipped. It does not create importer identities, modify business data or upload files. It reports complete normalized references and exact or similar names within a shared department. Name similarity is only a review signal. A missing candidate does not establish that a project is new, particularly when existing references or locations are missing.

Both the prepared importer and the admin experimental importer block unresolved candidates before inserting records. The check covers the whole source project, including known sibling references outside the selected demandes. It runs under a database lock before writes, so concurrent changes cannot bypass it. The prepared importer includes the candidates in `ONAGRE_LOCAL_REPORT` on failure. The admin preview marks them as conflicts and rechecks its target fingerprint before application.

Only the relevant importer's stable identity registry permits replay; `source = 'onagre'` alone never grants ownership. Importer-owned sibling demandes remain independent. No existing Démarche Numérique record is adopted, overwritten or automatically merged. Review must distinguish the same demande, a different demande belonging to the same project, and unrelated projects.

For a reviewed **same-demande** match, the local prepared importer supports an explicit link that preserves the DN record. Prepare an ignored JSON plan with `formatVersion: 1` and an `entries` array. Each decision contains `action: "link_existing_demande"`, `projectPath`, `projectHash`, `demandeKey`, `dossierId`, `targetHash`, and a reason explaining the evidence. Compute both hashes with `reconciliationHash` from `local-import/linked.mjs`, over the complete prepared project and `to_jsonb(dossier)` respectively. Include supporting evidence in the decision. Review the complete source dump for duplicate codes, multiple referenced projects, dates and locations; a reference alone is insufficient.

When the review relies on existing decisions, expert opinions or comments, also include `targetEvidenceHash`: hash the result of `reconciliationEvidence(client, dossierId)` from the same module. These tables are locked and their complete rows checked before a new link is written. Matching decision/opinion milestones can corroborate a reference despite different deposit dates, but different dates, qualifications and opinion wording remain intact; linking is not a data correction. Replay permits subsequent business edits and does not reapply the original evidence snapshot.

When file metadata supports the review, additionally include `targetFilesHash`, computed from `reviewedFileMetadata(client, currentDossier, evidence)` in `local-import/link-existing/files.mjs`. This reads the metadata of files referenced in those rows, sorted by UUID, under a lock. It rejects changed or newly attached file metadata before linking. File names are evidence about attachments, not proof that their contents were read.

```sh
# Validate and roll back; inspect the resulting report first.
node --env-file=.env --import tsx scripts/onagre/link-existing.mjs \
  reviewer@email .fleet/onagre/link-plan.json .fleet/onagre/link-dry-run.json
# Apply the reviewed links to the pinned local database only.
node --env-file=.env --import tsx scripts/onagre/link-existing.mjs --apply \
  reviewer@email .fleet/onagre/link-plan.json .fleet/onagre/link-result.json
```

The default profile requires a complete demande reference. Several demandes in the same source project can each link to their own DN record, or share one combined DN record when it explicitly lists all their references and the review confirms their scopes. The latter follows the owner's decision to preserve the combined record and attach every confirmed reference. Include every candidate and all its matched references in the same plan, with the same complete project snapshot and separate evidence for each demande. One combined DN record receives one project membership, with all source labels, and several private source links; its business fields remain unchanged. Unreviewed candidates, repeated demande keys, implicit reuse across different source projects and mixed project snapshots are rejected before any membership is written. Existing groupings cannot be adopted or replaced implicitly. Replaying a previously reviewed project requires its complete, unchanged decision set.

When one DN explicitly combines references from several source projects, each decision must additionally contain the exact `sharedTargetProjectKeys` list and a `sharedTargetReview` of at least 80 characters. Supply all those projects together, with every prepared demande covered, no omitted demandes, no fallback match profiles, and one shared target only. The DN receives one grouping under its existing title and one membership. Every original project key, demande key and source hash remains separately recorded in the private provenance ledger. Re-importing either complete source project returns the same unchanged DN. An incomplete shared review, implicit extension of an existing decision set, or differing existing groupings is rejected.

Two explicit fallback profiles support a project with exactly one prepared demande and no raw sibling or omitted demande. Set `matchProfile`, `scopeReview` (a specific explanation of at least 80 characters), and `targetEvidenceHash`. `project_reference` requires the exact project code and no other complete reference in DN. `corroborated_scope` requires an empty DN reference, shared geographic scope, and an exact deposit date, signature date, or expert/opinion-date pair from the source demande. Placeholder dates do not count. These conditions corroborate a manual review; they never select a demande among siblings or automatically approve a name match. Keep discrepancies explicit in the reason and leave both records' business values intact.

A `documented_reference_conflict` decision can preserve a DN record whose stored code points to another operation, only after explicit owner approval. It requires one prepared/raw demande with no omissions, shared geography, exact original and conflicting references, the owner decision, a substantial explanation of the rejected reference, a matching title excerpt, checked attachment metadata, and a retained PDF with SHA256, decree number, physical pages, clause review and signature matching both the source demande and DN decision. These checks bind a manual documentary review; they do not interpret the PDF or correct DN data. The full review is retained in the private ledger. The wrongly coded source remains blocked by reconciliation; it is never automatically linked or imported through this exception.

For a reviewed demande within a project containing siblings, `scoped_milestone` additionally requires `scopeMilestone: { kind, date, expert? }`. The kind is `deposit`, `signature` or `opinion`; an opinion also names its expert. The exact milestone must exist in the selected demande and DN record, and in no other source demande. Every raw sibling must be present in the prepared project, with no omissions. DN must have an empty reference or exactly the project code, and share the source geography. The manual scope explanation remains mandatory. A matching date alone never initiates a link, and unlinked siblings continue to block importing the project.

An optional `scopeMilestone.targetQuote` can identify the milestone in DN's `free_comment` when its structured date records another event. The exact quote must remain present, include the source date in ISO or French numeric format, name the event's role, and name the expert for an opinion. This preserves both dates without rewriting either. For a sole source demande with no omitted or raw sibling and an empty DN reference, `corroborated_text` can instead retain an exact `scopeExcerpt` of at least 200 characters and 30 distinct words from both descriptions, with shared geography and the same explicit scope-review requirements. Reviewers must establish that it describes the specific operation, not common boilerplate. Neither fallback automatically selects candidates.

When existing DN records themselves duplicate a request or separately track supplements, the owner-approved policy is to retain every record and link the documented main record. Include `relatedExisting` on that link decision, with each secondary record's `dossierId`, `relationship` (`duplicate` or `supplement`), full `targetHash`, `targetEvidenceHash`, and a specific reason of at least 80 characters identifying the principal. The review must establish which record is primary; an emptier entry or a similar name alone is insufficient. Secondary records receive no business edits, imported identity or new project membership. Their relationship is retained in the main link's private decision. Full reviewer access is required for all records, and changes to secondary evidence block replay for fresh review. A secondary record cannot simultaneously be a selected main target, an existing imported/linked record or a negatively reviewed unrelated candidate.

For a proven non-match, use a separate homogeneous plan with `action: "exclude_candidate"`, `projectPath`, `projectHash`, `dossierId`, `targetHash`, `targetEvidenceHash`, and a specific reason of at least 80 characters. The same CLI validates, previews and records these decisions in the private `excluded_candidate` ledger. It changes no business records. A negative decision applies only to that exact project/target pair and becomes invalid if the prepared source, full target record, decisions, expert opinions or comments change. If the review relies on attachment metadata, include `targetFilesHash`; renamed or newly attached evidence then invalidates the negative review too. The locked, validated exclusion also permits a separate source record to be created when the rejected DN candidate happens to store its exact code. This never adopts that DN record and never bypasses another candidate. New candidates still block import; a linked pair cannot be excluded. Do not classify related DN entries or uncertain matches as unrelated to bypass reconciliation. The admin experimental importer does not consume this local ledger.

Reviewer access and source/target hashes are checked under a transaction lock. The operation creates only the project grouping, memberships and private reconciliation ledger. A single-record project retains the current DN title; a project with several records uses the reviewed Onagre project title, while each DN record keeps its own title. The DN source, business fields, statuses, history, attachments, actors and access stay unchanged. There is no data enrichment from Onagre in this operation. The plan and record IDs must remain private.

Reapplying the exact decision is a no-op. The prepared importer reports `linked_existing` and skips all business writes for linked demandes, preserving subsequent instructor edits. Changed source proposals, target identity or membership require a fresh review. Other unlinked demandes within the same project block importing that project until their scope is resolved. The read-only report distinguishes fully reconciled projects from partial links and unresolved candidates. The separate admin experimental importer still blocks these candidates; the local ledger does not grant it ownership.

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
RUN_ONAGRE_DATABASE_TESTS=1 node --env-file=.env --import tsx --test \
  scripts/onagre/local-import/reconciliation.test.mjs scripts/onagre/local-import/linked.test.mjs
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
