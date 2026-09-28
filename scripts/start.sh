#!/usr/bin/env bash

# Request body size limit. adapter-node defaults to 512 KB. The admin app still
# receives uploads in the request body, and Scalingo's router rejects any body
# over 75 MB with a 413 before it reaches the app, so we stay just under that.
# The instructeur app sends files straight to object storage through signed
# URLs (capped by MAX_UPLOAD_SIZE, 1 GB by default), so this limit no longer
# applies to its uploads. Overridable via the deployment environment.
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
