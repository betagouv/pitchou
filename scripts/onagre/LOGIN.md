# Onagre login through staging admin

The two Onagre apps use the registered production ProConnect callback at
`https://staging.admin.pitchou.incubateur.net/auth/callback`. The existing staging
admin and instructeur keep their domains, databases, sessions and normal login flows.
The bridge does not require a database migration on the staging broker.

## Flow

1. Onagre creates random state and a verifier in a signed, host-only, HttpOnly,
   Secure cookie lasting ten minutes. A per-app HS256 key authenticates the start
   request, which contains the state and SHA-256 verifier challenge and expires
   after sixty seconds.
2. Staging admin accepts only configured clients and exact HTTPS origins. It
   verifies issuer, audience, subject, type, signature and expiry, then starts its
   normal ProConnect flow. Its signed OAuth transaction records the Onagre client
   and browser challenge. No arbitrary return URL is accepted.
3. After verifying ProConnect state, nonce and identity, staging returns an A256GCM
   encrypted handoff to that client's fixed `/auth/bridge/callback`. It includes
   only issuer, subject, email and names, with a random ID, audience, state,
   challenge and sixty-second expiry. No provider tokens, staging session tokens
   or permissions leave the broker. The broker does not provision an account or
   session in its own database for this flow.
4. Onagre verifies the handoff and its browser cookie, then inserts the handoff ID
   into `auth_login_handoff` in the same transaction as identity linking and local
   session creation. The primary key prevents simultaneous/repeated acceptance.
   Expired IDs are cleaned on subsequent accepts. Only an existing, active account
   with local `admin:access` may log in; the bridge grants no permissions.

Both bridge responses use `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.
The handoff is encrypted, but proxy logs containing full callback URLs should still
be treated as authentication logs. A lost browser cookie, expired handoff or failed
transaction requires starting login again. Concurrent logins in separate tabs can
replace the transaction cookie and cause the earlier attempt to fail closed.

Onagre logout deletes its local session. It does not log the user out of staging or
ProConnect; provider tokens are deliberately not shared. Existing staging logout
continues to use its normal ProConnect flow.

## Configuration and deployment

Broker only, on `osc-secnum-fr1/pitchou-admin-staging`:

- `AUTH_BRIDGE_ENABLED=true`
- `AUTH_BRIDGE_CLIENTS` is a JSON array of `{id, origin, secret}` entries.
- Each client has a distinct random 32-byte secret encoded as 64 lowercase hex characters.
- `PUBLIC_SITE_URL_ADMIN` stays `https://staging.admin.pitchou.incubateur.net`.
- Keep the existing production ProConnect credentials. Do not set `AUTH_BRIDGE_ORIGIN` here.

Each Onagre app:

- `AUTH_BRIDGE_ORIGIN=https://staging.admin.pitchou.incubateur.net`
- `AUTH_BRIDGE_CLIENT_ID` matches its broker entry.
- `AUTH_BRIDGE_SECRET` matches only that entry's secret.
- `PUBLIC_SITE_URL_ADMIN` and `ORIGIN` remain the app's own HTTPS origin.
- Keep `SESSION_COOKIE_DOMAIN` unset; never share staging cookies or databases.
- `ONAGRE_DEPLOYMENT_ROLE` must be `workspace` or `rehearsal`.
- Apply migration `20261030120000_auth-login-handoff.ts` before enabling login.

Deploy the broker capability before enabling the clients. No DNS changes or
ProConnect registration changes are needed. The Onagre apps can retain their
Scalingo domains. Verify all three login entry points and reject unknown clients,
unsigned requests and callbacks without the originating browser cookie.

The broker must remain in future staging admin releases. Deploying an older
staging revision removes the bridge and interrupts Onagre login. Existing Onagre
sessions remain usable. Restarting the instructeur staging app can reset its own
database through its existing startup script, so do not restart it for this change.
To disable new bridged logins, unset `AUTH_BRIDGE_ENABLED` on the broker and restart
only staging admin. Removing the bridge settings on an Onagre app restores direct
ProConnect login, which currently fails because its callback is not registered.

## Verification

Admin unit tests cover normal login, authenticated bridge starts, callback
verification ordering, cookie binding, expiry, tampering and client isolation.
`scripts/onagre/verify-login-bridge.ts` creates and drops a random disposable local
PostgreSQL database using explicit `ONAGRE_VERIFY_ADMIN_URL`. It verifies migrations,
permissions, concurrent replay, account restrictions and atomic rollback. It never
migrates or resets `DATABASE_URL`.
