#!/usr/bin/env bash

# Request body size limit for uploads. adapter-node defaults to 512 KB, which is
# too small for attachments. The real ceiling is Scalingo's router: it rejects
# any request body over 75 MB with a 413 before it reaches this app, and that
# limit is not configurable. We stay just under it so the app enforces the same
# bound (and the UI hint, which reads this value, stays truthful). Overridable
# via the deployment environment.
export BODY_SIZE_LIMIT="${BODY_SIZE_LIMIT:-70M}"

# Single repo, two deployed apps. PITCHOU_APP selects which one this container runs.
# Only instructeur runs the database migrations; admin shares the same database.
if [ "$PITCHOU_APP" = "admin" ]; then
  exec node apps/admin/build/index.js
else
  if [ "$PUBLIC_PITCHOU_ENV" = "staging" ]; then
    echo "Resetting staging database (drop + recreate public schema)…"
    corepack pnpm --filter @pitchou/database exec node --import tsx scripts/wipe-schema.ts || echo "⚠ staging schema wipe failed (non-fatal)"
    echo "Emptying staging S3 bucket…"
    aws s3 rm "s3://$S3_BUCKET" --recursive || echo "⚠ staging S3 wipe failed (non-fatal)"
  fi
  corepack pnpm --filter @pitchou/database exec node --import tsx ./node_modules/knex/bin/cli.js migrate:latest --env production
  if [ "$PUBLIC_PITCHOU_ENV" = "staging" ]; then
    echo "Seeding staging data…"
    corepack pnpm --filter @pitchou/database exec node --import tsx ./node_modules/knex/bin/cli.js seed:run --env staging || echo "⚠ staging seed failed (non-fatal)"
  fi
  exec node apps/instructeur/build/index.js
fi
