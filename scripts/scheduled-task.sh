#!/usr/bin/env bash
set -eo pipefail

# Rehearsal copies can contain production queues and external identifiers.
if [ -n "${ONAGRE_DEPLOYMENT_ROLE:-}" ]; then
  echo "Scheduled task disabled in the Onagre deployment"
  exit 0
fi

exec "$@"
