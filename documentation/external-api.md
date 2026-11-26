# Pitchou external API

The Instructeur app serves Swagger UI at `/api/v1/docs` and the OpenAPI contract at `/api/v1/openapi.json`. Anyone can open both URLs without a Pitchou account or API key. Requests to the API's data endpoints require a bearer token.

CI validates the contract and checks compatibility against the pull request target branch and the merge queue base revision. A breaking change requires a new API version and a migration period announced to partners.

## Personal keys

Sign in with ProConnect and open **Paramètres → API** (`/parametres/api`). Name the key, choose its scopes and lifetime, and copy the token. Pitchou displays the token once and stores its hash. The page shows when each key was last used and lets you revoke it.

Each request applies the key's scopes and the account's current permissions. Revoking permissions or disabling the account takes effect on subsequent requests. Accounts without dossier access can create keys for their account data and reference data.

## Service keys

**Intégrations API** (`/integrations-api`) requires `admin:access` and an individual grant of `admin:api:manage`. Any active account with `admin:access` and `users:manage` can assign this grant to another user or to itself. On an existing instance, use an administrator who can already edit users. On a fresh database, the initial user migration assigns the `administrateur` profile to the accounts configured in `PITCHOU_ADMIN_EMAILS`, giving them the permissions to assign the grant.

In the admin app, open the account under **Utilisateurs → Permissions personnalisées**. Choose **Autoriser** for **Gérer les intégrations et les clés de service de l’API** and save.

Open **Intégrations API** and add one service per partner integration. In **Habilitations**, grant access to a dossier by its Pitchou number, to the dossiers assigned to an active instructeur group, or to **Tous les dossiers**. The last option covers existing and future dossiers, including dossiers without a group. Each new service needs a grant before it can read dossiers.

Create a key for the service with the agreed scopes. Service key lifetimes are 7, 30, 90, 180, or 365 days. Existing keys keep their original expiration dates. Share the token through a private channel and give the partner the API URL. A service can have multiple keys during rotation. Revoking a key removes its access. Disabling the service blocks all its keys and other credentials. The integration owns its keys, and the administration audit log records administrative changes.

On first deployment, the Instructeur app applies the API migration to the shared database. Scalingo deploys both apps automatically. **Intégrations API** temporarily returns `503` if the admin app starts before the migration finishes.

## Scopes and resources

| Scope                    | Resources                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dossiers:read`          | Dossier list, details, and related resources. A personal key uses its owner's access level. For service keys, the matching grant gives **Lecture restreinte**.                  |
| `dossiers:read:internal` | The **Lecture complète** grant adds access to internal information. The service key needs both scopes, and both grants must cover the dossier.                                  |
| `account:read`           | The owner's account, personal keys, groups and members, notifications, preferences, and recent searches. Only personal keys can use this scope.                                 |
| `references:read`        | Activities, TAXREF, BDC-Statuts, protected species, impact types, methods, means of pursuit, public statistics, and release notes. This scope is independent of dossier grants. |

All paths below are relative to `/api/v1`. These operations are read-only.

- `GET /dossiers` lists dossiers by ascending Pitchou ID. Use `limit` (default 50, maximum 100) and pass the returned `next_cursor` as `after` to fetch the next page. Filters include `status`, the main `department`, `q` (name or identifier), and `followed` for personal keys.
- For personal keys, the list also includes access levels, locations, activities, impacted species references, and upcoming deadlines. Internal dossier access includes the latest comment.
- `GET /dossiers/{id}` returns project details and the current instruction status. The related resources `avis-experts`, `decisions`, `especes-impactees`, `phase-events`, `followers`, and `pieces-jointes` apply the dossier's read access level.
- Internal dossier access includes `prescriptions`, `controles`, `comments`, `history`, and `cnpn-emails`. Unofficial expert opinions, requests for expert opinions, and internal attachments require the same access level.
- `GET /dossiers/{id}/follower-candidates` lists people a personal key holder can add as followers on a dossier they can instruct.
- The attachment list provides a download URL for each file. Use the same `Authorization` header to download it. The dossier in the URL determines access, including for files shared across several dossiers.
- `GET /account` identifies the key holder. Related data is available under `/account/groupes`, `/account/notifications`, `/account/notification-preferences`, and `/account/recent-searches`.
- `GET /account/api-keys` returns the holder's personal key metadata. `GET /account/groupes/{groupId}/member-candidates?q=…` searches for people to add to an active group the holder belongs to.
- Published release notes are available at `/references/changelog`. `/references/synchronization-status` returns the time of the last successful Démarches Numériques synchronization.
- Swagger documents the paths under `/references` and their search parameters.

Calendar dates, such as signature dates and deadlines, use `YYYY-MM-DD`. Timestamps use UTC.

## Call the API

With `just dev` running, open `/api/v1/docs`, click **Authorize**, paste the raw token, then use **Try it out**. Staging supports interactive requests when `EXTERNAL_API_SWAGGER_TRY_IT_OUT=true` and `PUBLIC_PITCHOU_ENV=staging`. Serve the API over HTTPS.

```sh
curl --fail-with-body \
  -H "Authorization: Bearer $PITCHOU_ACCESS_TOKEN" \
  "$PITCHOU_BASE_URL/api/v1/dossiers?limit=20&department=75&status=instruction"
```

The dossier list and details return `status` and `status_changed_at`. When a dossier has no recorded phase event, its status is `accompagnement_amont` and the date is `null`. Replace legacy status-only keys with a key carrying `dossiers:read` to use these resources.

- A missing or invalid token, or one belonging to a disabled account or service, receives `401`. A token without the required scope receives `403`.
- Missing dossiers and dossiers outside the holder's grants both return `404`.
- The limit is 60 requests per minute per personal key or service. Requests over the limit receive `429` and a `Retry-After` header.
- Data and error responses include `Cache-Control: no-store` and `X-Request-Id`. The `external_api_request` log records the account or service and the key ID when available.

## OAuth integrations

An OAuth-enabled integration can request a token using `client_credentials` from the provider specified for that integration. Existing OAuth-enabled services keep their access. Services created in the admin app use service keys.

To configure an OAuth client, register its `client_id` in `external_api_client` with `allow_oauth = true`. Manage its grants in **Intégrations API**. Set `EXTERNAL_API_ISSUER`, `EXTERNAL_API_AUDIENCE`, and `EXTERNAL_API_JWKS_URL` on the Instructeur app. Reserve the Pitchou audience for `client_credentials` clients and use a distinct audience per environment. The provider must issue an `at+jwt` signed with RS256 or ES256, valid for at most ten minutes, with the same identifier in `sub` and `client_id`.
