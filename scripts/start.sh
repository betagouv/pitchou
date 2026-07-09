#!/usr/bin/env bash

# Request body size limit for uploads. adapter-node defaults to 512 KB, which is
# too small for attachments. We can't go unlimited either: uploads are buffered
# fully in memory (a few copies), so a large file would OOM the 1 GB container.
# 200 MB leaves headroom for the copies and concurrent requests. Overridable via
# the deployment environment.
export BODY_SIZE_LIMIT="${BODY_SIZE_LIMIT:-200M}"

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
