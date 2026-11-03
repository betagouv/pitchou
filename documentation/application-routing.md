# Application-owned routing and notifications

The shared server package owns rule matching, effective access, assignment recalculation, follow cleanup, notification eligibility, scheduling and outbox transition history. Both apps and the synchronization worker use it. PostgreSQL stores the records and enforces foreign keys, uniqueness and transactions. SQL queries remain in TypeScript for bulk matching, counts and pagination, without installed business functions.

## Transaction contract

- Acquire `lockDossierAccess` before changing routing, account permissions, membership, direct grants or follow state. Read authorization again after acquiring the lock.
- After all routing changes in an operation, call `recalculateAssignments` once before commit. Supply affected dossier IDs for dossier edits. Rule and activity changes can affect every dossier and use an unrestricted recalculation. Administrative rule changes and seeds use `silent: true` to establish arrival baselines without sending mail.
- After account, permission, membership or direct-grant changes, call `reconcileDossierAccess` before commit. It preserves follows while any reading access remains and cancels ineligible pending emails.
- `changeAssignments` and `changeDossierAccess` wrap these steps for scripts and fixtures. Production services that already own a transaction call the same primitives. Never recalculate between deleting and reinserting rules in a single operation.
- Log dossier actions through `logActionsDossier`. Synchronization uses `withDeferredActionNotifications` around the complete operation so initial-import baseline marking happens before notification eligibility is evaluated.
- Change outbox delivery state through `updateNotifications` so history and metrics commit with the transition. Delivery still rechecks current access and preferences before claiming a send.

Direct SQL writes to domain tables no longer recalculate assignments, clean follows or queue emails. Maintenance scripts must use these services. Migrations already on main retain their historical SQL so an older database can still upgrade in order.

The two unapplied branch migrations create the routing and access tables directly, without installing new business functions. `20261101120000_dossier-access-levels.ts` also removes the superseded routing and email-policy functions and triggers inherited from main. Unrelated technical triggers remain, including account preference defaults, permission-configuration bookkeeping, preference history and personal notification revision tracking.

There is no additional transition migration. Reset a disposable local database that already applied earlier versions of these branch migrations, then replay migrations and seeds. Production has not applied these branch migrations.

## Deployment

This transition requires a coordinated application update. Do not run the old app or synchronization worker against the migrated schema: that code still calls removed functions. Do not run the new app against the old schema: both it and the old triggers would perform the same work.

1. Build and validate the new versions of both apps and the worker before the maintenance window.
2. Stop incoming writes, scheduled synchronization and email dispatch. Drain existing operations and stop all old writer processes.
3. Take a database backup, then apply migrations with the writers stopped.
4. Start both apps and the worker from the same new revision. Verify access, an assignment preview and notification queue health before resuming scheduled work.

The migrations preserve existing assignments, follows, arrival baselines and pending emails, add the default instruction access level and record exceptional assignments as manual inclusions. They do not replay historical notifications. Rolling back requires restoring the pre-migration backup with its matching application version. Coordinate that recovery before allowing new writes, since restoring a backup discards writes made afterward.

## Verification

The migration regression compares persisted records before and after removing the functions, verifies that raw writes no longer route, and checks that application routing and notification audit failures roll back the complete operation. Integration tests exercise access parity, revocation while requests wait, rule precedence, silent recalculation and synchronization. The notification suite checks cancellation, retry history, baseline imports and timezone boundaries against PostgreSQL. Browser tests exercise the same services through both apps.
