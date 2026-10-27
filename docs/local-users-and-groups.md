# Local users and group ownership

Pitchou owns users, permissions, group membership and dossier ownership. DN supplies dossier data. Its groups and instructor list no longer change access in Pitchou. A Pitchou account does not need a DN account.

Both applications use ProConnect. On the first login, Pitchou matches the ProConnect email to an existing `auth_user`, ignoring case and surrounding spaces. This includes accounts migrated from email-link login and accounts prepared by administrators. It preserves the account ID, permissions and memberships, then binds the account to the ProConnect issuer and subject. If no email matches, it creates an account with no permissions or groups. A different address or alias does not automatically recover an existing account. Later logins use the identity binding, even if the email changes. A different identity cannot claim an already bound account by email.

The admin pages `/utilisateurs` and `/groupes-instructeurs` manage accounts and coverage. Effective permissions are the union of bundle permissions and individual grants, minus exclusions. The definitions live in `libs/types/src/permissions.ts`.

| Permission               | Access                                                           |
| ------------------------ | ---------------------------------------------------------------- |
| `dossier:read`           | Read dossiers when the user belongs to at least one active group |
| `dossier:instruct`       | Full access to dossiers owned by the user's groups               |
| `admin:access`           | Enter the admin application                                      |
| `admin:dossiers:create`  | Create dossiers, including their initial files                   |
| `admin:dossiers:update`  | Edit dossier fields, relations and phases                        |
| `admin:dossiers:delete`  | Delete native dossiers                                           |
| `admin:dossiers:files`   | Add or remove dossier attachments                                |
| `admin:dossiers:species` | Replace or remove impacted-species files                         |
| `admin:activites:manage` | Edit activities, labels and categories                           |
| `admin:especes:manage`   | Edit or remove protected-species reference corrections           |
| `admin:changelog:create` | Create changelog drafts                                          |
| `admin:changelog:update` | Edit and publish changelog entries and manage their media        |
| `admin:changelog:delete` | Delete changelog entries                                         |
| `admin:sync:run`         | Run DN synchronization                                           |
| `admin:sync:simulate`    | Simulate DN changes on dossiers, where simulation is enabled     |
| `users:manage`           | Manage users and their permissions                               |
| `groups:manage`          | Manage groups, membership and department coverage                |

The `instructeur` bundle grants both dossier permissions. The `administrateur` bundle grants every permission. Admin pages still require `admin:access` alongside their management permission. An administrator needs group membership to access dossiers through the instructor application.

Adding a group member grants the instructor bundle only if that account's permissions have never been configured. The database remembers permission changes even after the last grant or exclusion is removed. Saving an account in administration also records an explicit configuration when all permissions are empty. Removing and re-adding a member cannot undo those administrator choices.

Group assignment follows automatic rules and persistent manual exceptions, described below. Several groups can own the same dossier. Database triggers recalculate assignments when routing criteria, rules or group activity change. This applies to DN dossiers and native dossiers. The dossiers page lists dossiers without an owning group.

Users read dossiers outside their groups with the existing read-only field and document restrictions. Removing the last active membership removes all dossier access. Sessions resolve permissions and membership on every request. A browser also checks for access changes when it regains focus. Followers must retain instruction permission and membership in an owning group. Losing one of several qualifying memberships preserves the follow.

## Deployment configuration

Register each application's `/auth/callback` and `/auth/login` logout return URL with the ProConnect client. Both apps need `PROCONNECT_DOMAIN`, `PROCONNECT_CLIENT_ID`, `PROCONNECT_CLIENT_SECRET` and `ADMIN_SESSION_SECRET`. Set `PUBLIC_SITE_URL_PITCHOU` and `PUBLIC_SITE_URL_ADMIN` to their respective public origins.

Both staging apps must set `PUBLIC_PITCHOU_ENV=staging` and `SESSION_COOKIE_DOMAIN=pitchou.incubateur.net`. This shares sign-in and sign-out between `staging.pitchou.incubateur.net` and `staging.admin.pitchou.incubateur.net`. Leaving the domain unset on either app creates separate sessions. Leave it unset only for localhost, where both apps already share a hostname.

Staging uses `pitchou_staging_session`; production uses `pitchou_session`. Staging ignores the old `pitchou_session` cookies, including any conflicting host-only and parent-domain cookies left by previous deployments. Users must sign in once after deploying this change to both apps. Do not delete the old parent-domain cookie from staging, since it may belong to a production session.

Changing the instructor app's environment restarts it. On staging, `scripts/start.sh` then resets the database and S3 bucket and runs the seeds, just as it does after a deployment.

For the default local URLs, register all four URLs on the integration client:

| Application | Callback URL                          | Logout return URL                  |
| ----------- | ------------------------------------- | ---------------------------------- |
| Instructor  | `http://localhost:5173/auth/callback` | `http://localhost:5173/auth/login` |
| Admin       | `http://localhost:5174/auth/callback` | `http://localhost:5174/auth/login` |

If ProConnect reports `invalid_redirect_uri`, compare the rejected `redirect_uri` with the client's registered URLs. The scheme, host, port and path must match. An existing admin callback registration does not cover the instructor callback. Keep both registrations and add the corresponding public URLs for each deployed environment.

Before running migrations, set `PITCHOU_ADMIN_EMAILS` in the migration environment. The migration converts those addresses into administrator bundles once. In production, future grants come from the users page; changing that environment variable after migration does not change permissions.

On staging, the instructor app resets the database, runs migrations, then runs the development seeds. Set `PITCHOU_ADMIN_EMAILS` on that app to a comma-separated list of the team's ProConnect email addresses. Staging seeds create any missing accounts, grant the administrator bundle, and add each account to the `Administrateur` group. Repeated seeds keep existing accounts and memberships without duplicates. This restores access to both applications after each reset. Removing an email from the variable does not revoke an existing account until the next reset; use the users page for immediate changes.

Deploy the migrations and both applications together. Stop the old synchronization worker before migration and restart it with the new version. Take a database backup first. The migrations retire instructor capability tables and require restoring that backup with the previous application version to roll back.

Existing staff IDs remain the same in comments, history, notifications, follows and metrics. Their foreign keys now reference `auth_user`. Applicant and contact data remains in `personne`. Existing instructor memberships become local memberships, and initial department coverage comes from existing dossier ownership. The groups page marks that coverage for review. Review it after migration, especially departments with no existing dossiers.

Migration `20261023103000_map-imported-group-departments.ts` completes coverage for known imported group names using the DN routing rules supplied on 5 October 2026. It expands regional rules into department codes, gives `Administrateur` every supported code, and assigns `Dév Pitchou` to `99`. It keeps DDT37, DDT 41 and DDT 45 inactive as shown in DN. It only updates imported groups still awaiting review, so administrator-saved coverage takes precedence. It preserves existing department links; links outside the mapped territory keep the group flagged for review. Unknown names, including `Multi-régions` and `Groupe de test`, keep their existing coverage and review flag. The migration does not create missing groups or reconnect group management to DN. Ownership triggers apply the coverage to existing dossiers; dossiers without a primary department remain unmatched.

Migration invalidates existing sessions. Old email links and capability URLs no longer authenticate. Users sign in again through ProConnect.

`SEED_EMAIL` is optional and defaults to `dev@localhost.local`. It selects the demonstration account, grants it the administrator bundle and membership in `Administrateur`, and uses it for seeded follows and authorship. CNPN email sends from that account remain blocked on staging. For local development, set it to your ProConnect test email if you want to use that account. Staging team access through `PITCHOU_ADMIN_EMAILS` does not require `SEED_EMAIL`. The former `/dev-login` endpoint no longer signs users in.

Development groups have explicit department coverage in `libs/database/seeds/fixtures/groupes.ts`. Dossier fixtures must specify `primary_department`, and the normal ownership triggers assign their groups. The 11 realistic examples have primary departments; a separate demonstration dossier, DN number `99000012`, intentionally leaves it null so the unmatched-dossier alert remains testable. Rerunning seeds refreshes dossier fixtures and preserves coverage already saved for existing groups.

Migration `20261023104000_granular-admin-permissions.ts` replaces each direct `admin:write` grant or exclusion with the twelve granular write permissions. It preserves existing individual exclusions and leaves bundles unchanged. Deploy the migration with the updated applications. The administrator bundle grants all current permissions; users can receive individual grants or exclusions. Admin read access remains controlled by `admin:access`, with separate management permissions for the users and groups pages. Admin dossier permissions apply across groups and do not grant instructor-app access. Unlisted write routes are denied until assigned a permission. Editing a dossier with attached uploads requires the matching file permissions as well as dossier editing.

## Upgrade after email notifications

The local-user migrations now run on 23 October, after the deployed email-notification migrations. The upgrade preserves account IDs, saved mail preferences, pending messages and notification history. Preferences and delivery checks use `auth_user` and `user_groupe`. Arrival tracking records every group owning a dossier, with one email per recipient when several groups receive the dossier together. Delivery rechecks active membership and instructor permissions.

The ownership migration baselines existing dossiers instead of emailing the historical backlog. After the flexible-assignment migration below, rule and group changes also baseline existing dossiers silently. Ordinary dossier arrivals retain their notifications. General, Notifications and My groups share the instructor settings navigation.

Databases that ran the earlier version of this feature branch recorded the local-user migrations under 5 October. Those databases, including any staging instance that ran this branch, need their migration history reconciled before applying this version. Do not apply it blindly or reset a database containing data to retain. Databases on the deployed `main` migration history follow the normal upgrade path.

## Flexible assignment rules

Group rules can filter the primary department, project communes by INSEE code and the resolved activity code. Criteria within a rule use AND, selected values within a criterion use OR, and a group receives a dossier when any of its rules matches. An empty criterion imposes no restriction. A rule must have at least one criterion. An empty rules list means manual assignments only. All matching active groups receive the dossier; there is no priority between groups. A commune match requires at least one project commune, never an applicant address. A missing value cannot satisfy a populated criterion. Unreviewed activity labels resolve to `autre`, consistently with dossier filters. Reviewing or changing an activity mapping recalculates assignments.

Migration `20261027120000_flexible-groupe-assignment.ts` retains `groupe_departement` as the storage for unrestricted department rules and adds `groupe_regle` for conditional rules. This preserves existing department coverage and seed behavior without rewriting historical migrations. The administration editor presents both as one rule list. The existing API's `departments` input updates only the unrestricted department rule and preserves conditional rules. New clients submit `rules` instead. Sending both a nonempty `departments` list and `rules` is rejected.

`groupe_dossier_override` records either a manual inclusion or an explicit exclusion for a group and dossier. An override takes precedence over all rules of that group. Restoring automatic mode deletes the override. Archiving a group removes its effective assignments and access, but retains its rules and overrides for later reactivation. Effective assignments remain in `edge_groupe_instructeurs__dossier`; access and follower eligibility continue to use that table. Replacing rules installs the complete new coverage before removing old coverage, preserving follows where final eligibility does not change. Existing exceptional edges that do not match department rules become manual inclusions during migration.

The group editor previews additions and removals, including manual exceptions and group activation, before saving. It displays counts and up to 100 dossier links in each direction. Changing the form invalidates its preview. Saving rechecks the submitted preview against the current rules, membership and resulting assignments under the access advisory lock. A changed result requires a new preview. The legacy API remains usable without a preview token; the editor always supplies one.

Rule edits, group activation changes and activity mapping corrections silently baseline existing dossier assignments. They cancel obsolete pending arrival messages and do not send new arrival messages for the recalculation. Ordinary dossier arrivals and manual inclusions retain arrival notifications. Migration also baselines existing assignments. Preview is read-only. Group and manual-assignment writes require both `admin:access` and `groups:manage`, recheck authorization in the transaction, and record administration events. The dossier administration page explains automatic matches, manual inclusions and exclusions, including exceptions on DN dossiers.

The department alert reports departments without unrestricted automatic coverage. Conditional rules can cover some dossiers there; the unmatched-dossier list remains the check for dossiers with no effective assignment.
