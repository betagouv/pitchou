# Onagre migration workspace

The admin route `/onagre` supports the team's correspondence meetings. It stores proposals, decisions, comments and revision history in PostgreSQL. All administrators can read it. Writes require `admin:onagre:manage`, included in the administrator bundle.

This version does not create or update Pitchou dossiers. Validating a correspondence records a business decision, not an executable transformation.

## Load the first backup

Apply the repository migrations with the usual deployment procedure. The migrations create the preparation tables and a separate table for the full source rows. Set the admin Node adapter's `BODY_SIZE_LIMIT=66M`, and allow that request size at the reverse proxy. The application accepts packages up to 64 MiB. The supplied backup produces a compressed full package of about 52 MiB. Increase both limits together if a later package exceeds them.

In the repository's Nix shell, prepare a package:

```sh
node --import tsx scripts/onagre/prepare.ts \
  '/path/to/postgresql_database-onagre-lastbackup(6)' \
  '/path/to/Correspondance Pitchou onagre.xlsx' \
  '.fleet/onagre/prepared.jsonl.gz'
```

The parent output directory must exist. The script refuses to overwrite an existing output. `pg_restore` must be installed. It decodes the backup to stdout; no SQL from the backup is executed. The script preserves source IDs, text, nulls and empty strings. PostgreSQL column types and comments supply the descriptions for fields absent from the workbook.

Open **Migration Onagre → Explorer le dump → Charger un autre dump**, and select the JSONL.gz package. The upload runs in one transaction. A failed load leaves no partial snapshot. The original dump and prepared package contain personal data and belong outside Git. `.fleet/` is ignored.

The first load copies every recognized field and reference proposal from all five workbook sheets. Repeated activity IDs remain separate proposals. Original workbook rows are retained with the snapshot. All proposals start as **À traiter**, including rows marked with a check in Excel. The app adds a correspondence for every source column absent from the workbook.

## Full source storage

The preparation script reads the backup twice. The first pass builds the schema manifest, correspondence seeds and core records. The second streams every source row in batches of 500 into a gzip-compressed JSONL file. It never builds the entire multi-million-row JSON document in memory. The upload accepts at most 64 MiB compressed, 2 GiB expanded and 64 MiB per JSONL block.

The loader validates table names, column names, cell types and counts, and checks that the streamed demandes and projects agree with the manifest. All writes and the completed flag commit together. Truncated or malformed loads roll back. Rows use the snapshot, table name and source row position as their explorer key, so duplicate values and tables without a primary key remain browsable. This position is not a dossier migration identity.

Older JSON packages remain supported. They cannot populate the full explorer. Prepare the original dump again with a .jsonl.gz output and upload it: the loader fills the same snapshot's missing rows, without adding a duplicate snapshot or touching mapping decisions. New packages use the full format; an explicit .json output still creates the older core-and-samples package.

## Use during the meeting

1. Filter **Correspondances** by source table, text or status.
2. Read the destination and rule in the list, then open an entry to review its notes. The original workbook text and confidence remain available under **Proposition d'origine**.
3. Edit the Pitchou destination and the transformation specific to this correspondence. Leave notes empty when there is no unresolved question. Use **Règles communes** for decisions shared across correspondences, such as comment authors, identity matching, missing dates and update conflicts.
4. Use **À valider** for a draft awaiting review and **À discuter** for a question the team must resolve. **Validée** requires a destination and a rule. **Exclue** requires a reason. Only validated and excluded entries count toward completed decisions.
5. Save each decision. Concurrent edits return a conflict instead of replacing another person's work.
6. Use **Demandes Onagre** to search demandes and their linked projects. **Explorer le dump** lists every source table, including empty ones. Search table names in the sidebar, browse rows in pages of 25, search all values, choose the visible columns with all/none/individual selections, and click a row to read every value in full. Use **Ajouter un filtre** for column conditions. Conditions combine with AND and with the text search. Exact equality is case-sensitive; contains/starts/ends searches are case-insensitive and treat SQL wildcard characters literally. Numeric comparisons compare numbers, and date comparisons use calendar dates in YYYY-MM-DD format. Missing values and empty strings have separate operators. Negative comparisons exclude NULL. Up to 12 conditions are supported. Column selection updates immediately; **Rechercher** or **Appliquer les filtres** applies the query and returns to page one. The URL preserves columns, search, filters and pagination through reloads and row details. The **Structure** view shows columns and their source descriptions. NULL and empty strings remain distinct.
7. Export decisions and their full revision history with **Exporter les décisions** in the header. Database backups remain the authoritative backup of the workspace.

The destination input suggests current database columns but also accepts descriptions for multi-table transformations. The recorded rules are prose, so they require implementation and tests before an actual import.

**Règles communes** contains nine editable drafts. They have their own review status, revision history and optimistic concurrency checks. They do not affect the correspondence progress count. The history tab and decision export include their revisions. Validating a shared rule records a decision; it does not configure or execute an importer.

## Prepare drafts from the team's proposals

`reviewed-decisions.json` contains the review of all 190 nonempty workbook proposals against the current Pitchou schema. It proposes 127 drafts **À valider** and 63 **À discuter**, with destinations, rules and notes. Existing notes are preserved. The 340 entries without a proposal remain untouched. No entry is automatically validated or excluded.

After applying the migrations, preview these drafts against the local preparation database:

```sh
node --env-file=.env --env-file=.fleet/onagre/local.env --import tsx scripts/onagre/apply-decisions.ts
```

To save them, append `--apply actor-email`, using an existing active administrator's email for revision attribution. The script refuses remote database hosts. It locks each correspondence and requires its version, original proposal, context and decision fields to match the reviewed baseline. Entries edited since the review are skipped and listed by key. Matching drafts are unchanged on repeat runs, without extra revisions. All changes commit in one transaction through the normal decision history mechanism.

The manifest is a dated review of this workbook, not a general proposal parser. Keep later edits in the admin app. New dumps preserve these decisions as usual. Original proposals remain stored separately and available in the editor and export.

`concise-decisions.json` revises those 190 drafts to remove shared instructions and repeated review reminders. It preserves their destinations, statuses and original workbook notes. Run the same command with `--concise` to preview these revisions, then `--concise --apply actor-email` to save them. Each revision requires the exact previous draft and its version; intervening edits are skipped. Repeated application writes nothing. On a fresh workspace, apply the original drafts first, then the concise revisions. Shared rules come from the database migration and remain editable in the app.

## Load a later dump

Run the same preparation command with the new backup and the unchanged original workbook. The admin workspace is now the place to edit correspondences. A different workbook is rejected to prevent moved spreadsheet rows from being mistaken for existing decisions.

Upload the package from **Explorer le dump**. The explorer switches to the uploaded snapshot; the selector also lets you return to an earlier dump. The SHA-256 of the original dump identifies an already-loaded snapshot. The unique database constraint and transaction lock also protect concurrent loads. A new snapshot keeps existing decisions and adds newly discovered columns.

The comparison uses `demandesid`. It reports added, changed, unchanged and absent demandes compared with the preceding loaded snapshot. A canonical hash covers the complete demande and its linked project. Changes confined to species, decisions, attachments or other related tables are outside this comparison. Loading an older dump later does not establish that it is newer source data. Select and label the intended snapshot before interpreting the comparison. No absent record is deleted.

## Findings from the supplied folder

The inspected backup contains 58 tables and 3,268,584 rows, including 22,069 demandes and 17,569 projects. There are 848 demandes without a reception date and 13 repeated demande-code occurrences beyond the distinct codes. Do not use the human-readable code as a unique migration key, and do not copy `demandesid` into Pitchou's own primary key.

The workbook has 190 nonempty proposals. With uncovered source fields, the workspace has 530 correspondence entries. The renewable-energy activity has several competing targets. Some statuses and date meanings still need confirmation. A project can have several demandes, and one demande per Pitchou dossier remains a business choice to confirm.

## Supporting files in Sources

The **Sources** tab inventories all 15 files verified in Polaris's `Downloads/Onagre` folder on 25 October 2026. `source-review.json` records their contents, previous use, inclusion decision, rationale and reviewed SHA-256. The original local copies matched Polaris byte for byte. The tab shows the same review and links to the matching dump or correspondences.

Thirteen originals are stored in PostgreSQL behind the admin authentication check. Spreadsheets and CSVs have searchable, paginated views with original row numbers. PDFs display extracted text and provide an original-file link for figures and layout. Markdown displays as escaped plain text. Source cells are text, not executable HTML or spreadsheet formulas. Empty sheet rows are omitted, but populated cells, duplicates and original files are retained.

The dump and the 107 MB species CSV are not duplicated as document blobs. Their metadata links to the full dump explorer. The library does not merge historical exports, create species, assign services, or replace existing correspondence decisions. Each document retains the snapshot examined during its review, even when another dump becomes available.

Files and findings:

- `structure_et_contenu.md` and `onagre_structure.xlsx` describe the 58 tables, keys, constraints and samples. Both are readable in Sources; the workbook has 59 sheets. They supplement the explorer, which reads the backup directly.
- `services.xlsx` lists 281 Onagre services and 29 historical Pitchou groups associated with démarche 88444. It contains no completed service-to-group association. Both sheets are available for review.
- `services.csv` and `groupesespeces.csv` contain 281 and 175 records. Every row matched the corresponding dump table after normalizing nulls and booleans and ignoring unnamed trailing CSV columns. They remain available as supporting files, without another business import.
- `Correspondance_Nom_projet_Objet_projet.ods` has 59 work rows linking tracking categories, Onagre objects and proposed DS objects. It is available for comparison, without overwriting the team's current workbook decisions.
- `TaxrefOnagre.ods` compares two Onagre rows and two TAXREF v10 rows for Salamandra corsica, including IDs 701817 and 79253. It illustrates names and synonymy, not a complete migration mapping.
- `export_especes_groupes2.ods` joins species and group labels. Its 17,999 data rows comprise the dump's 17,997 associations plus two groups without species. The joined view is available in Sources.
- `especes.csv` has 574,366 rows and 18 columns. Every normalized row matched the dump, so its entry points to that table instead of storing a second 107 MB copy. The dump contains versionespeces values 1, 8, 10 and 12; this column alone does not establish each row's TAXREF version. Pitchou's importer uses TAXREF v18.
- `20240109.csv` is a tab-separated list of 4,351 projects, with number, object, name, petitioner and reception date. Earlier documentation incorrectly classified it as a species file. It is now a searchable historical reference, without merging it into the dump.
- `20240607_ONAGRE_listedemandes.ods` lists 17,349 demandes, including status labels, instructeur, service and region. Its heading says 2 June 2024 despite the filename's 7 June date. It lacks demandesid and is available as historical evidence, not an update source.
- `onagre_-_liste_des_tables_de_reference_-_v2-8_cle291a3c.pdf` is a 27-page January 2019 reference guide with screenshots and allowed labels. It helps interpret fields, but cannot replace the dump's actual values or a confirmed status-code dictionary.
- `Gargominy_et_al_2018.pdf` describes TAXREF v12, CD_NOM, CD_REF, synonymy and version changes. The supplied PDF contains 62 pages despite a 156-page internal citation. It is methodology, not TAXREF v18 or a version-conversion table.

Load the reviewed library with `pdftotext` on PATH after applying migrations:

```sh
node --env-file=.env --env-file=.fleet/onagre/local.env --import tsx scripts/onagre/load-documents.ts /path/to/Onagre
node --env-file=.env --env-file=.fleet/onagre/local.env --import tsx scripts/onagre/load-documents.ts /path/to/Onagre --apply
```

The first command previews. The second saves all documents in one transaction. The script rejects unreviewed filenames, changed checksums and remote databases, and requires the matching dump to be loaded. Repeated filename/checksum pairs create no copies. A revised file can be retained as another document version after its review is updated. The decision export includes source metadata and reviews, without the original binary files. Database backups retain the originals and extracted views.

The database has 89,377 attachment metadata records. Their file paths do not supply the attachment bytes. Obtain a corresponding file archive before attachment migration.

## Remaining implementation before dossier import

After the team resolves the mappings, implement a dry run that produces proposed dossier changes and blocking issues. Keep a permanent source-to-Pitchou ledger with a unique key for the Onagre instance, source table and internal source ID. Store child mappings for decisions, comments, species impacts and attachments too. Create each dossier and its ledger entry in the same transaction. Existing Pitchou dossiers carrying Onagre codes need reconciliation, since the source codes are not unique.

For later updates, compare the last imported source values, incoming source values and current Pitchou values. Flag conflicts instead of overwriting instructeur changes. Retain source payloads and mapping versions. Scope email notifications and dossier routing explicitly for the import. This workspace does not yet implement that ledger, dry run, update policy or migration executor.

## Verification

```sh
pnpm --filter @pitchou/app-instructeur exec vitest run --config tests/vitest.config.ts --project=unit onagre
pnpm --filter @pitchou/app-admin exec vitest run --config tests/vitest.config.ts --project=unit src/lib/server/permissions.test.ts
node --env-file=.env --import tsx scripts/onagre/verify.ts
node --env-file=.env --import tsx scripts/onagre/verify-explorer.ts
node --env-file=.env --import tsx scripts/onagre/verify-filters.ts
node --env-file=.env --import tsx scripts/onagre/verify-decisions.ts
node --env-file=.env --import tsx scripts/onagre/verify-shared-rules.ts
node --env-file=.env --import tsx scripts/onagre/verify-documents.ts
```

The verification scripts require a migrated local database and refuse remote database hosts. They roll back all fixtures. The first checks repeated loading, snapshot differences, preserved decisions, stale-edit rejection and revision history. The explorer check covers upgrading an older snapshot, repeated and future loads, pagination, literal search characters, null and empty values, and rollback on malformed or truncated packages.

The filter check covers combined text/column queries, numeric and date comparisons, NULL and empty strings, SQL wildcard escaping, and rejection of unknown columns or invalid filter values.

The reviewed-decision check verifies manifest coverage and destination columns, dry runs, repeat application, preserved source text and notes, later edits, and audit history. When using the isolated preview database, add `--env-file=.fleet/onagre/local.env` after `--env-file=.env`.

The shared-rule check covers the concise revision's full coverage, preserved destinations/statuses/original notes, empty notes, repeat application, protection of human edits, and shared-rule validation, conflicts and history. Its fixtures roll back.

The document check covers UTF-8 and tab-separated data, row numbering, original bytes, repeated loading, new file versions, pagination, literal search and unchanged correspondence decisions. Its fixtures roll back.
