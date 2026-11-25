# Demonstrating reviewed Onagre progress on regular staging

This is separate from the Onagre workspace/rehearsal deployments. Deploying to
regular staging and importing data requires the owner's instruction.

Staging startup now preserves its database and S3 files. `STAGING_RESET_DATA=true`
explicitly enables the old destructive reset/seed procedure; leave it unset for
an imported demonstration. Both regular apps share the instructeur database.

Before deployment, back up the database, record the previous staging commit,
and verify the staging email allowlist. Build staging from `main`, merge the
reviewed feature commit locally, then push once with an exact force-with-lease
when resetting the branch was authorised. This avoids deploying intermediate main.

`staging-import.mjs` accepts a private gzip NDJSON bundle, its SHA256, and optionally an
existing active reviewer email. Without a reviewer, existing dossier access is left unchanged
and group routing alone assigns imported dossiers. With one, the reviewer receives an
`instruct` grant on each imported dossier; an existing read-only grant for that account stops
the project instead of being upgraded, so pass a reviewer only when that account has none. The bundle identifies the reviewed cutoff and contains
checksummed prepared projects plus species reference rows. A header contains the
reference rows and project count; subsequent lines contain one project each. Escape U+2028,
U+2029 and U+0085 in each line (`\u2028`, `\u2029`, `\u0085`): the reader splits lines on
them, and some prepared projects contain them. The
entire stream is validated before opening a database connection. Keep source data,
credentials, bundles and reports in ignored private storage, never Git.

Build the bundle locally from the prepared project files, both in ignored storage. The command
writes every `<projet>.json` in numeric order, escapes U+2028, U+2029 and U+0085, validates each project (naming the file that fails, without leaving a partial bundle)
and refuses to replace an existing bundle. It prints the project count and the SHA256 to review:

```sh
node --import tsx scripts/onagre/staging-bundle.mjs backups/onagre/migration/full/projects backups/onagre/staging-bundle-YYYYMMDD/bundle.json.gz reviewed-cutoff-name
```

The header carries no species reference rows: staging already holds the local reference tables,
and a project that needs a missing row fails on its own in the import report.

Run in a foreground Scalingo one-off container on `pitchou-staging` in
`osc-secnum-fr1`, uploading the bundle with `scalingo run --file`. The entry point
pins the database, bucket and staging email protection. No production target is
accepted. Example command inside that container:

```sh
node --import tsx scripts/onagre/staging-import.mjs /tmp/uploads/bundle.json.gz SHA256 20
node --import tsx scripts/onagre/staging-import.mjs --apply /tmp/uploads/bundle.json.gz SHA256
```

The first command rolls back database changes and checks the first 20 projects.
Omit the limit for a complete dry run. Dry runs retain only an operational report
in staging S3. Apply uses batches of 20, retries failed batches by project, and
retains failures. Existing data is never deleted. Missing species reference rows
are inserted without replacing staging choices. Same-SIRET metadata is normalised
to the first prepared occurrence, as in the full local importer.

Progress is recorded transactionally in `onagre_local_import.staging_progress`.
Rerunning the exact bundle resumes committed projects; the underlying importer
preserves human edits and rejects unowned conflicts. Reports are retained under
`onagre-import/<bundle-sha256>/` in the private staging bucket. Generated species
workbooks are uploaded before their database transaction commits. A failed commit
can leave unreferenced objects; it cannot leave a committed missing attachment.

Check the final failure list, database counts, sample project membership, reviewer
access, attachments and both staging URLs before sharing the demonstration.
Research that has not passed semantic review must remain outside the bundle.
