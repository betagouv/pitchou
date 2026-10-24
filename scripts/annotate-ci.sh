#!/usr/bin/env bash
# Rerun only failed type checks in each workspace so annotation paths are correct.
# The original just recipe owns the result. This script only adds annotations.
set -euo pipefail
case "${1:-}" in
  types)
    pnpm -r --no-bail exec bash -c '
      set -o pipefail
      tsc --pretty false 2>&1 | reviewdog -f=tsc -reporter=github-annotations -filter-mode=nofilter
    '
    ;;
  svelte)
    pnpm --filter './apps/*' --no-bail exec bash -c '
      set -o pipefail
      svelte-check --fail-on-warnings --output machine 2>&1 | reviewdog \
        -efm='"'"'%n %tRROR "%f" %l:%c "%m"'"'"' \
        -efm='"'"'%n %tARNING "%f" %l:%c "%m"'"'"' \
        -efm="%-G%.%#" -name=svelte-check \
        -reporter=github-annotations -filter-mode=nofilter
    '
    ;;
  *) echo "Usage: $0 types|svelte" >&2; exit 2 ;;
esac
