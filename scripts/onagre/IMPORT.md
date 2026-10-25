# Experimental sample import

The first importer handles one explicit sample of 1 to 10 internal `demandesid` values from a staged snapshot. It runs synchronously. It has no scheduler, background worker or production mode.

`experimental-skeleton-v1` creates a dossier with `source=onagre`, `projet.nomprojet`, `demandes.codedemande` and `demandes.datereception`. The reception date must be a valid civil date in `YYYY-MM-DD` form. The profile stores that historical date at midnight UTC in the required `depot_date` timestamp. It never substitutes today's date and never creates phase events. Names and codes are trimmed. Missing values and actual database length or required-column constraints block the record.

This profile is an explicit experiment. Validated prose in the correspondence workspace is evidence to retain, not executable mapping code. It does not authorize the date policy or implement the other decisions. The preview displays that distinction and lists omitted fields. Database defaults still apply, including `enjeu=false` and an empty `free_comment`. The insert trigger creates the usual `notification_arrival` marker, but the importer creates no recipients, sends no notifications and calls no email dispatcher.

The stable identity is `onagre-national` plus `demandesid`. The snapshot is provenance, not part of that identity. A unique ledger key prevents a second dossier for the same identity across snapshots. Dossier, ledger and run report commit in one transaction. Repeating the same applied preview returns its existing report. A new preview of an unchanged identity reports `already_imported`. Any source payload or imported dossier change causes a conflict. Existing Onagre-code matches without a ledger, including a single match, remain blocked for manual reconciliation. Repeated source codes are also blocked.

Previews make no database writes. Each server process keeps at most 100 previews for 15 minutes, bound to the requesting administrator. Expiry, eviction or a server restart requires another preview. Apply checks the frozen snapshot, raw demande and projet, all current mappings, their revision identifiers, shared rules, database column constraints and matching target rows. A change rejects the whole selection with HTTP 409. Successful runs retain that frozen input and all hashes in `onagre_import_run`; the ledger also retains the raw demande and projet. Other source tables remain in the staged snapshot. Reports list every preview record, including blocked and unselected records.

Writes require all of these exact settings and `admin:onagre:manage` through `withAdminWriteAccess`:

```dotenv
ONAGRE_DEPLOYMENT_ROLE=rehearsal
ONAGRE_IMPORT_ENABLED=true
ONAGRE_SOURCE_INSTANCE=onagre-national
```

The default is disabled. Preview remains available to authenticated admin readers. Apply takes brief table locks against concurrent source, mapping and dossier edits, with a three-second lock timeout and a fifteen-second statement timeout. These locks are suitable for this small rehearsal sample. Large batches need a separate design.

## API

- `POST /onagre/imports` with `{action:"preview",snapshotId:1,recordIds:["123"]}` returns `OnagreImportPreview`.
- `POST /onagre/imports` with `{action:"apply",previewId:"UUID",recordIds:["123"]}` applies an explicit subset of ready or already imported rows and returns `OnagreImportRun`.
- `GET /onagre/imports?runId=UUID` returns the saved report.

The shared contract lives in `libs/types/src/onagreImport.ts`. Unknown actions and invalid identifiers return HTTP 400. Writes outside the configured rehearsal role return HTTP 403. A stale preview returns HTTP 409. Source strings remain data throughout the pipeline.

## Local CLI

The CLI refuses remote database hosts. Load the intended local rehearsal environment explicitly. It does not create an administrator or grant permissions. The actor must already have `admin:access` and `admin:onagre:manage` for apply.

```sh
node --import tsx scripts/onagre/import.ts preview 1 123,456 7 /tmp/onagre-preview.json
node --import tsx scripts/onagre/import.ts apply /tmp/onagre-preview.json 123 7
node --import tsx scripts/onagre/import.ts report RUN_UUID
```

Preview creates a new private JSON file and refuses to overwrite it. Apply rereads the source and compares the saved hashes before creating a fresh process-local preview. It rejects an expired file. It prints the final report, including its run ID. This CLI requires `DATABASE_URL` and the three write settings for apply.

## Disposable database verification

```sh
ONAGRE_VERIFY_ADMIN_URL=postgresql://USER@127.0.0.1:PORT/postgres node --import tsx scripts/onagre/verify-import.ts
```

The admin connection must be local and permit database creation. The script creates a random `onagre_import_verify_*` database, migrates it, runs synthetic fixtures and drops that same database in `finally`. It never migrates or resets the existing `DATABASE_URL` database. It checks gates, read-only previews, required data, historical dates, omitted relations and notifications, raw provenance, atomic rollback, identity replay across snapshots, legacy-code ambiguity, human edits, stale previews and concurrent apply. The deliberate ledger failure is an expected regression check.
