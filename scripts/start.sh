#!/usr/bin/env bash

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
