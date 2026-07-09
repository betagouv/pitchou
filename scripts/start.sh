#!/usr/bin/env bash

# No request body size limit: we want to allow attachments of any size.
# Without this, adapter-node rejects any request over 512 KB with a 413 error
# (see BODY_SIZE_LIMIT). Still overridable from the deployment environment.
export BODY_SIZE_LIMIT="${BODY_SIZE_LIMIT:-Infinity}"

# Single repo, two deployed apps. PITCHOU_APP selects which one this container runs.
# Only instructeur runs the database migrations; admin shares the same database.
if [ "$PITCHOU_APP" = "admin" ]; then
  exec node apps/admin/build/index.js
else
  corepack pnpm --filter @pitchou/database exec node --import tsx ./node_modules/knex/bin/cli.js migrate:latest --env production
  if [ "$PUBLIC_PITCHOU_ENV" = "staging" ]; then
    echo "Seeding staging data…"
    corepack pnpm --filter @pitchou/database exec node --import tsx ./node_modules/knex/bin/cli.js seed:run --env staging || echo "⚠ staging seed failed (non-fatal)"
  fi
  exec node apps/instructeur/build/index.js
fi
