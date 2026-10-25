#!/usr/bin/env bash
set -eo pipefail

# Onagre deployments own their database and must preserve it across restarts.
if [ -n "${ONAGRE_DEPLOYMENT_ROLE:-}" ]; then
  case "$ONAGRE_DEPLOYMENT_ROLE" in
    workspace|rehearsal) ;;
    *) echo "Invalid ONAGRE_DEPLOYMENT_ROLE" >&2; exit 1 ;;
  esac
  if [ "${PITCHOU_APP:-}" != "admin" ] || [ "${PUBLIC_PITCHOU_ENV:-}" != "staging" ]; then
    echo "Onagre deployments require the admin app and staging email restrictions" >&2
    exit 1
  fi
  pnpm --filter @pitchou/database exec node --import tsx ./node_modules/knex/bin/cli.js migrate:latest --env production
  exec node apps/admin/build/index.js
fi

# Single repo, two deployed apps. PITCHOU_APP selects which one this container runs.
# Only instructeur runs the database migrations; admin shares the same database.
if [ "$PITCHOU_APP" = "admin" ]; then
  exec node apps/admin/build/index.js
else
  if [ "$PUBLIC_PITCHOU_ENV" = "staging" ]; then
    echo "Resetting staging database (drop + recreate public schema)…"
    pnpm --filter @pitchou/database exec node --import tsx scripts/wipe-schema.ts || echo "⚠ staging schema wipe failed (non-fatal)"
    echo "Emptying staging S3 bucket…"
    aws s3 rm "s3://$S3_BUCKET" --recursive || echo "⚠ staging S3 wipe failed (non-fatal)"
  fi
  pnpm --filter @pitchou/database exec node --import tsx ./node_modules/knex/bin/cli.js migrate:latest --env production
  if [ "$PUBLIC_PITCHOU_ENV" = "staging" ]; then
    echo "Seeding staging data…"
    pnpm --filter @pitchou/database exec node --import tsx ./node_modules/knex/bin/cli.js seed:run --env staging || echo "⚠ staging seed failed (non-fatal)"
  fi
  exec node apps/instructeur/build/index.js
fi
