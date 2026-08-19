import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { listPublishedChangelogEntries } from "@pitchou/server/database/changelog.ts";

// Public endpoint (no auth guard): feeds the « Nouveautés » page. Only published
// entries are exposed; `contenu` was sanitized at write time. `no-cache` so a
// freshly published entry appears on the next page load (the payload is small;
// the heavy parts — the media — cache hard on their own routes).
export const GET: RequestHandler = async () => {
  return json(await listPublishedChangelogEntries(), {
    headers: { "Cache-Control": "no-cache" },
  });
};
