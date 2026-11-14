#!/usr/bin/env bash
set -eo pipefail

if [ "${DISABLE_SCHEDULED_TASKS:-false}" = "true" ]; then
  echo "Scheduled tasks disabled for this application"
  exit 0
fi

# Rehearsal copies can contain production queues and external identifiers.
if [ -n "${ONAGRE_DEPLOYMENT_ROLE:-}" ]; then
  echo "Scheduled task disabled in the Onagre deployment"
  exit 0
fi

exec "$@"
