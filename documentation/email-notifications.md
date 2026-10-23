# Email notifications

## Preferences and triggers

The three preferences are independent and apply to the whole account. All are enabled by default. Users can change them under **Mon espace > Paramètres > Notifications**, at `/parametres/notifications`. A successful save persists the choices across page reloads.

| Notification                    | Recipients and timing                                                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Arrival in a groupe instructeur | Every group member with this preference enabled, even without following the dossier. Sent immediately after admin creation or DN synchronization, including an actual transfer to another group. |
| Assignment for follow-up        | The person assigned the dossier by someone else, if their preference is enabled. Sent immediately after the assignment commits.                                                                  |
| Updates                         | Each person following the dossier, for eligible changes made by someone else. One email per person and dossier, due at 06:00 in `Europe/Paris`, then processed by the next worker run.           |

Eligible updates include changes to the DN form, its attachments and species, attachments added in Pitchou, and changes in **Instruction**, **Avis** and **Contrôles**. Self-authored actions, follow-up changes and document generation are excluded. The initial DN import does not produce an update email. Changes detected at or after 06:00 belong to the following day's batch. Daylight saving time is handled automatically.

Unchanged values, identical assignments and synchronization without changes do not create duplicates. Existing dossiers, historical changes and re-enabled preferences do not trigger catch-up emails. Reading a notification in Pitchou does not remove a pending email.

Before sending, the worker checks the preference and dossier access again. Assignments and updates still require follow-up; arrival notifications require access to the relevant group. Disabling a preference, losing access or leaving follow-up cancels the affected pending emails. A transfer cancels pending arrival notifications for the previous group.

## Email content

The three templates share the Pitchou logo, a light layout with a purple border, a dossier link and an italic settings link. They announce the change without describing the dossier contents.

- Arrival: `Nouveau dossier: N° - Titre`.
- Assignment: `Attribution dossier: N° - Enjeu - Titre`.
- Update: `Nouveauté: N° - Enjeu - Titre`.

The enjeu label is **À enjeu**, **Sans enjeu** or **Enjeu à déterminer**. Without a DN number, the email uses the Pitchou dossier ID. Links open `/dossier/ID?tab=historique` and `/parametres/notifications`, without secrets or capabilities. The PNG logo is served at `/images/pitchou-logo-email.png`. Content frozen for a first sending attempt stays unchanged during retries.

## Configuration

| Variable                  | Purpose                                                                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`            | Database used by the application and worker.                                                                                                                           |
| `PUBLIC_SITE_URL_PITCHOU` | Instructeur origin for dossier, settings and logo links in emails.                                                                                                     |
| `BREVO_API_KEY`           | Transactional email key used by instructeur, admin and the worker. The fixed sender is `contact@pitchou.beta.gouv.fr`. No additional hosted Brevo template is needed.  |
| `PUBLIC_PITCHOU_ENV`      | The value `staging` enables staging recipient protection.                                                                                                              |
| `STAGING_EMAIL_ALLOWLIST` | Exact email addresses allowed in staging, separated by commas. Empty by default; domains and wildcards are not supported. Case and surrounding whitespace are ignored. |
| `MAILPIT_URL`             | Optional local capture, only with `NODE_ENV=development` or `test`. See [development email capture](test-email-capture.md).                                            |

In staging, every recipient, including CC/BCC, must be allowed. Otherwise, the message is blocked before Brevo and the notification becomes `suppressed`, without a sending attempt or retry. Adding an address later does not replay these messages. `PITCHOU_ADMIN_EMAILS` grants admin access, not permission to receive email. The allowlist does not restrict production. Seeded demo data does not trigger notifications.

The instructeur worker processes at most 100 candidates per run. Cron runs it every ten minutes; 06:00 is the due time, not a guarantee of sending at that exact minute. The same command does nothing when `PITCHOU_APP=admin`.

## Automated tests

The PostgreSQL suite uses real migrations in the disposable `pitchou_test_notifications` database and simulates all sends. The default port is 5433; use `TEST_DB_PORT` to change it.

```sh
docker compose -f compose.test.yml up -d test_db
pnpm exec just test-email-notifications
pnpm --filter @pitchou/app-instructeur exec vitest run --config tests/vitest.config.ts --project=unit dossierNotificationEmails deployment.test.ts
pnpm --filter @pitchou/app-instructeur exec vitest run --config tests/vitest.config.ts --project=component src/routes/parametres
pnpm --filter @pitchou/app-admin exec vitest run --config tests/vitest.config.ts --project=unit src/routes/mails
pnpm --filter @pitchou/app-admin exec vitest run --config tests/vitest.config.ts --project=component src/routes/mails
```

These tests cover preferences, author identity, unchanged or failed saves, arrivals, assignments, grouped updates, exclusions, access, absence of catch-up emails, daylight saving changes, concurrency, retries and deduplication. In particular, `retrySafety.test.ts` checks that a lost response followed by a 429 or 401 rejection cannot permit another send outside the safety window, while attempts that were all explicitly rejected remain retryable after a prolonged outage.

## Troubleshooting and history

The admin page at `/mails` uses the usual admin session and permissions. It lists notifications and CNPN emails together, with counts by type/status and 20 rows per page. Filters cover dossier, recipient, email ID, source, type, status, environment, existing CNPN tracking and dates. Date boundaries are inclusive in Paris time. **Échéance dépassée** includes pending emails with a deferred retry. Filters apply immediately. The sort panel orders the complete result set. Click a row to open Historique first, followed by Mail and Informations. The email preview preserves safe recorded inline styling in an isolated frame, without regenerating the message. Only the exact Pitchou logo URL on the configured instructeur origin can load an image; scripts, forms and other remote resources are blocked. CNPN receipt and opening counts use existing tracking for the principal recipient. CNPN records have no environment or attempt counter. Detail links use `email=notification:UUID` or `email=cnpn:UUID` to distinguish sources. Notification details show the frozen content when an attempt has started; unsent content is not reconstructed.

| Status       | Meaning                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `pending`    | Waiting to be sent, possibly with a normalized error and retry date.                                  |
| `failed`     | A CNPN send attempt failed. Intermediate attempts and raw errors are not recorded.                    |
| `sent`       | Accepted by the sender, without proof of delivery.                                                    |
| `cancelled`  | Cancelled with a reason such as a disabled preference, discontinued follow-up or lost access.         |
| `suppressed` | Recipient not allowed in staging, with no automatic retry.                                            |
| `uncertain`  | An attempt may have been accepted without confirmation; reconciliation with the provider is required. |

Errors are logged with the notification ID. A failed attempt waits at least one minute before retrying. The body and idempotency key stay unchanged. An expired claim can be recovered after two minutes. After a first ambiguous attempt, automatic retries stop at 25 minutes and the notification becomes `uncertain`. A later explicit rejection cannot erase that first timestamp. If every attempt was explicitly rejected, prolonged retries remain possible. Check the provider's transactional logs before intervening on an uncertain send.

The following command lists due candidates without sending or changing the queue. It requires `DATABASE_URL` and `PUBLIC_SITE_URL_PITCHOU`, but no Brevo key, and returns `dryRun: true` with `candidates`.

```sh
pnpm --filter @pitchou/worker exec tsx send-dossier-notification-emails.ts --dry-run
```

Durable state is stored in `email_notification_outbox`, attempts in `email_notification_history`, and preference changes in `email_notification_settings_history`. Use `attempt_count`, `provider_message_id`, `last_error` and `cancellation_reason` to diagnose a send without inspecting its HTML.

Server-side AARRI events are `notificationEmailQueued`, `notificationEmailSent`, `notificationEmailFailed`, `notificationEmailCancelled`, `notificationEmailUncertain`, `notificationEmailSuppressed` and `notificationEmailSettingsChanged`. Transitions are recorded with the outbox. An authenticated save produces an event only when it succeeds and changes a preference, with only the changed values before/after and the server timestamp.

System events are attributed to the recipient with `source: system` and `attribution: recipient`, without counting as a user action. The environment distinguishes real activity from tests. These events contain no email addresses, HTML bodies, secrets or raw provider errors. Admin views obtain recipient identity through an authorized join. Notification emails do not add delivery, bounce, open or click tracking. The CNPN list uses its existing receipt and opening timestamps.
