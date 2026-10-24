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
3. Edit the Pitchou destination, transformation rule, and unresolved questions.
4. Use **À valider** for a draft awaiting review and **À discuter** for a question the team must resolve. **Validée** requires a destination and a rule. **Exclue** requires a reason. Only validated and excluded entries count toward completed decisions.
5. Save each decision. Concurrent edits return a conflict instead of replacing another person's work.
6. Use **Demandes Onagre** to search demandes and their linked projects. **Explorer le dump** lists every source table, including empty ones. Search table names in the sidebar, browse rows in pages of 25, search all values, choose the visible columns with all/none/individual selections, and click a row to read every value in full. Use **Ajouter un filtre** for column conditions. Conditions combine with AND and with the text search. Exact equality is case-sensitive; contains/starts/ends searches are case-insensitive and treat SQL wildcard characters literally. Numeric comparisons compare numbers, and date comparisons use calendar dates in YYYY-MM-DD format. Missing values and empty strings have separate operators. Negative comparisons exclude NULL. Up to 12 conditions are supported. Column selection updates immediately; **Rechercher** or **Appliquer les filtres** applies the query and returns to page one. The URL preserves columns, search, filters and pagination through reloads and row details. The **Structure** view shows columns and their source descriptions. NULL and empty strings remain distinct.
7. Export decisions and their full revision history with **Exporter les décisions** in the header. Database backups remain the authoritative backup of the workspace.

The destination input suggests current database columns but also accepts descriptions for multi-table transformations. The recorded rules are prose, so they require implementation and tests before an actual import.

## Prepare drafts from the team's proposals

`reviewed-decisions.json` contains the review of all 190 nonempty workbook proposals against the current Pitchou schema. It proposes 127 drafts **À valider** and 63 **À discuter**, with destinations, rules and notes. Existing notes are preserved. The 340 entries without a proposal remain untouched. No entry is automatically validated or excluded.

After applying the migrations, preview these drafts against the local preparation database:

```sh
node --env-file=.env --env-file=.fleet/onagre/local.env --import tsx scripts/onagre/apply-decisions.ts
```

To save them, append `--apply actor-email`, using an existing active administrator's email for revision attribution. The script refuses remote database hosts. It locks each correspondence and requires its version, original proposal, context and decision fields to match the reviewed baseline. Entries edited since the review are skipped and listed by key. Matching drafts are unchanged on repeat runs, without extra revisions. All changes commit in one transaction through the normal decision history mechanism.

The manifest is a dated review of this workbook, not a general proposal parser. Keep later edits in the admin app. New dumps preserve these decisions as usual. Original proposals remain stored separately and available in the editor and export.

## Load a later dump

Run the same preparation command with the new backup and the unchanged original workbook. The admin workspace is now the place to edit correspondences. A different workbook is rejected to prevent moved spreadsheet rows from being mistaken for existing decisions.

Upload the package from **Explorer le dump**. The explorer switches to the uploaded snapshot; the selector also lets you return to an earlier dump. The SHA-256 of the original dump identifies an already-loaded snapshot. The unique database constraint and transaction lock also protect concurrent loads. A new snapshot keeps existing decisions and adds newly discovered columns.

The comparison uses `demandesid`. It reports added, changed, unchanged and absent demandes compared with the preceding loaded snapshot. A canonical hash covers the complete demande and its linked project. Changes confined to species, decisions, attachments or other related tables are outside this comparison. Loading an older dump later does not establish that it is newer source data. Select and label the intended snapshot before interpreting the comparison. No absent record is deleted.

## Findings from the supplied folder

The inspected backup contains 58 tables and 3,268,584 rows, including 22,069 demandes and 17,569 projects. There are 848 demandes without a reception date and 13 repeated demande-code occurrences beyond the distinct codes. Do not use the human-readable code as a unique migration key, and do not copy `demandesid` into Pitchou's own primary key.

The workbook has 190 nonempty proposals. With uncovered source fields, the workspace has 530 correspondence entries. The renewable-energy activity has several competing targets. Some statuses and date meanings still need confirmation. A project can have several demandes, and one demande per Pitchou dossier remains a business choice to confirm.

Other files inspected:

- `structure_et_contenu.md` and `onagre_structure.xlsx` describe the source schema and samples. The preparation script reads the backup's schema directly.
- `services.xlsx` lists 281 Onagre services and a separate sheet of Pitchou groups. It does not contain a completed association between them.
- `Correspondance_Nom_projet_Objet_projet.ods` is an older activity correspondence. It is not merged into the team's newer workbook automatically.
- `TaxrefOnagre.ods` refers to TAXREF v10. Pitchou's species documentation currently uses TAXREF v18. Species IDs and groups need explicit reconciliation.
- `export_especes_groupes2.ods`, `groupesespeces.csv`, `especes.csv`, and `20240109.csv` are species/reference inputs. They are retained locally, not treated as validated migration rules.
- `20240607_ONAGRE_listedemandes.ods` is an older list of demandes. The supplied database backup is the source for this workspace's record counts.
- The PDF documents remain reference material. This implementation does not ingest their contents.

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
```

The verification scripts require a migrated local database and refuse remote database hosts. They roll back all fixtures. The first checks repeated loading, snapshot differences, preserved decisions, stale-edit rejection and revision history. The explorer check covers upgrading an older snapshot, repeated and future loads, pagination, literal search characters, null and empty values, and rollback on malformed or truncated packages.

The filter check covers combined text/column queries, numeric and date comparisons, NULL and empty strings, SQL wildcard escaping, and rejection of unknown columns or invalid filter values.

The reviewed-decision check verifies manifest coverage and destination columns, dry runs, repeat application, preserved source text and notes, later edits, and audit history. When using the isolated preview database, add `--env-file=.fleet/onagre/local.env` after `--env-file=.env`.
