# Onagre deployments

Use the existing admin application with separate databases:

| App                   | Region         | Role      |
| --------------------- | -------------- | --------- |
| pitchou-admin-staging | osc-fr1        | workspace |
| pitchou-admin         | osc-secnum-fr1 | rehearsal |

The similarly named `osc-secnum-fr1/pitchou-admin-staging` is the existing staging app. Do not repoint it.

Both new deployments require `PITCHOU_APP=admin`, `PUBLIC_PITCHOU_ENV=staging`,
`ONAGRE_DEPLOYMENT_ROLE=workspace` or `rehearsal`, and their own `DATABASE_URL`.
`scripts/start.sh` applies migrations and starts admin without wiping or seeding data.
`scripts/scheduled-task.sh` suppresses the shared scheduler jobs in either Onagre role.
An invalid role fails startup. The existing instructeur staging startup is unchanged.

Set `ONAGRE_SOURCE_INSTANCE=onagre-national` consistently across dumps and environments.
Only rehearsal may set `ONAGRE_IMPORT_ENABLED=true`. Leave it absent or false elsewhere.
The importer offers full-dump analysis and background batches, plus a manual sample of at most ten demandes. Its experimental profile still creates only minimal dossiers. See [IMPORT.md](IMPORT.md).

Set `ORIGIN` and `PUBLIC_SITE_URL_ADMIN` to that app's HTTPS URL, and register its
`/auth/callback` URL with the configured ProConnect client. Use a fresh
`ADMIN_SESSION_SECRET`. Unset `SESSION_COOKIE_DOMAIN` for host-only cookies.
Use `BODY_SIZE_LIMIT=66M` for prepared dump uploads. Keep production Brevo,
Démarche Numérique and object-storage credentials out of both deployments.
An absent `STAGING_EMAIL_ALLOWLIST` blocks email delivery. Attachment operations
need a separately provisioned test bucket; database restores do not copy file bytes.

## First setup

1. Back up the existing local Onagre workspace before transferring it.
2. Restore that backup into a new, empty workspace database. Never reuse the
   legacy app's old `DATABASE_URL` without checking its destination.
3. Restore a recent production backup into the separate rehearsal database.
   Apply migrations, then transfer preparation data using `transfer.ts`.
4. Configure the intended team with `bootstrap-team.ts`. It requires
   `ONAGRE_EXPECTED_DATABASE` to equal the isolated database name and
   `PITCHOU_ADMIN_EMAILS` to contain the allowed team emails. Default is preview;
   append `--apply` to activate those accounts, disable other accounts and revoke
   copied sessions. It preserves historical identities and permissions in history.
5. Verify snapshot, correspondence, revision and source row counts before directing
   the team to the workspace. Verify an authenticated route and ProConnect redirect.
6. Enable database backups. A decision JSON export is not a full database backup.

The shared workspace owns the team's decisions. A rehearsal uses a fixed copy.
Reset only the rehearsal database, by an explicit operator operation. Never restore
the rehearsal database over production. A later production import must reconcile
against the production dossiers that exist at that time.

## Delivery

Deploy a reviewed, tested Git commit archive to these two apps. Their separate
builds use their respective origins. Do not push the experiment to the existing
production or staging deployment branches. After deployment, check HTTPS readiness
and database access before sharing the URL. A successful build alone is insufficient.
