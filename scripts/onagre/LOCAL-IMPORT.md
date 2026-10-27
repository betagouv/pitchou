# Local JSON dossier review

`local-import.mjs` imports JSON proposals into the existing development database without resetting it. It accepts only `NODE_ENV=development`, the `dev` database user and `localhost:5434/especes_pro_3731` or `127.0.0.1:5434/especes_pro_3731`. It rejects staging and connection-string overrides. This is a local review tool, not the production migration runner.

Run from the repository root with an existing local instructeur email and explicit sample files:

```sh
node --env-file=.env scripts/onagre/local-import.mjs reviewer@example.test .fleet/onagre/migration/dossiers/example.json
node --env-file=.env scripts/onagre/local-import.mjs --apply reviewer@example.test .fleet/onagre/migration/dossiers/example.json
```

Without `--apply`, the transaction rolls back. PostgreSQL sequences can still advance during a dry run. With `--apply`, all selected dossiers commit together. `ONAGRE_LOCAL_REPORT` optionally writes a private JSON report; point it inside the ignored workspace.

The input contains `identity`, `proposal.dossier` and optional `proposal.records`. Each related record has a stable `sourceKey`, a supported `table` and `values`. Prescriptions also specify an earlier decision's `parentSourceKey`. The importer validates an allowlist of tables and columns. It reads prepared values, never interprets mapping prose or calls an LLM.

Supported related tables are `decision_administrative`, `prescription`, `avis_expert`, `commentaire` and `evenement_phase_dossier`. Species, files, people and production service routing remain outside this first local importer. Draft proposals are accepted for local review. Approval statuses do not authorize production writes.

## Repeat imports

A private `onagre_local_import.identity` table records each dossier/source identity, target ID and previous imported values in the same transaction as the business records.

- An unchanged proposal reuses the existing dossier and child IDs.
- A changed proposal updates fields that have not been edited locally.
- An unchanged proposal preserves local edits.
- Conflicting changes stop and roll back the entire selected batch.
- A missing managed field is rejected. Use an explicit null to clear it.
- Related records removed from the JSON are retained and listed in the report. No implicit deletions occur.
- Deleted or reassigned imported records require explicit resolution. Existing unowned dossiers with the same Onagre code are not automatically adopted.

For local review, the importer assigns dossiers to an existing active group of the specified reviewer and follows them. This is not a production service mapping. Group-arrival notification baselining suppresses new group-arrival emails. No mail delivery or synchronization workers are started.

Comments without source dates retain an explicit note in their prepared content; the database creation date is the import date. Historical phase timestamps are explicit proposals and must be reviewed with their evidence.

## Validation

```sh
node --test scripts/onagre/local-import/merge.test.mjs
node --env-file=.env scripts/onagre/local-import/verify.mjs
```

The second command exercises the actual local PostgreSQL schema using synthetic records, then rolls back. It checks replay, changes, stable IDs, local edits, conflicts, retained removals and refusal to adopt existing dossiers.

Keep all real sample JSON, mapping exports, screenshots, backups and reports in the ignored `.fleet` workspace. Only reusable code, synthetic tests and this documentation belong in Git.
