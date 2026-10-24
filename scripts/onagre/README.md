# Onagre migration workspace

The admin route `/onagre` supports the team's correspondence meetings. It stores proposals, decisions, comments and revision history in PostgreSQL. All administrators can read it. Writes require `admin:onagre:manage`, included in the administrator bundle.

This version does not create or update Pitchou dossiers. Validating a correspondence records a business decision, not an executable transformation.

## Load the first backup

Apply the repository migrations with the usual deployment procedure. The new migration creates four separate preparation tables. Set the admin Node adapter's `BODY_SIZE_LIMIT=66M`, and allow that request size at the reverse proxy. The application accepts packages up to 64 MiB. The supplied backup produces a package of about 30.5 MB. Increase both limits together if a later package exceeds them.

In the repository's Nix shell, prepare a package:

```sh
node --import tsx scripts/onagre/prepare.ts \
  '/path/to/postgresql_database-onagre-lastbackup(6)' \
  '/path/to/Correspondance Pitchou onagre.xlsx' \
  '.fleet/onagre/prepared.json'
```

The parent output directory must exist. The script refuses to overwrite an existing output. `pg_restore` must be installed. It decodes the backup to stdout; no SQL from the backup is executed. The script preserves source IDs, text, nulls and empty strings. PostgreSQL column types and comments supply the descriptions for fields absent from the workbook.

Open **Migration Onagre**, expand **Charger un dump préparé**, and select the JSON package. The upload runs in one transaction. A failed load leaves no partial snapshot. The original dump and prepared package contain personal data and belong outside Git. `.fleet/` is ignored.

The first load copies every recognized field and reference proposal from all five workbook sheets. Repeated activity IDs remain separate proposals. Original workbook rows are retained with the snapshot. All proposals start as **À traiter**, including rows marked with a check in Excel. The app adds a correspondence for every source column absent from the workbook.

## Use during the meeting

1. Filter **Correspondances** by source table, text or status.
2. Read the original proposal and confidence level.
3. Enter the Pitchou destination, transformation rule, and unresolved questions.
4. Mark the entry **À discuter**, **Validée**, or **Exclue**. Validation requires a destination and a rule. Exclusion requires a reason.
5. Save each decision. Concurrent edits return a conflict instead of replacing another person's work.
6. Use **Demandes Onagre** to search the full demandes and their linked projects. **Tables source** shows source row counts and three examples per table.
7. Export decisions and their full revision history from the page. Database backups remain the authoritative backup of the workspace.

The destination input suggests current database columns but also accepts descriptions for multi-table transformations. The recorded rules are prose, so they require implementation and tests before an actual import.

## Load a later dump

Run the same preparation command with the new backup and the unchanged original workbook. The admin workspace is now the place to edit correspondences. A different workbook is rejected to prevent moved spreadsheet rows from being mistaken for existing decisions.

Upload the package from the admin page. The SHA-256 of the original dump identifies an already-loaded snapshot. The unique database constraint and transaction lock also protect concurrent loads. A new snapshot keeps existing decisions and adds newly discovered columns.

The comparison uses `demandesid`. It reports added, changed, unchanged and absent demandes compared with the preceding loaded snapshot. A canonical hash covers the complete demande and its linked project. Changes confined to species, decisions, attachments or other related tables are outside this comparison. Loading an older dump later does not establish that it is newer source data. Select and label the intended snapshot before interpreting the comparison. No absent record is deleted.

## Findings from the supplied folder

The inspected backup contains 58 tables, 22,069 demandes and 17,569 projects. There are 848 demandes without a reception date and 13 repeated demande-code occurrences beyond the distinct codes. Do not use the human-readable code as a unique migration key, and do not copy `demandesid` into Pitchou's own primary key.

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
```

The last command requires a migrated local database. It checks repeated loading, snapshot differences, preserved decisions, stale-edit rejection and revision history inside a transaction that rolls back all test fixtures. It refuses remote database hosts.
