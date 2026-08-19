import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { listPublishedChangelogEntries } from "@pitchou/server/database/changelog.ts";

// Public endpoint (no auth guard): feeds the « Nouveautés » page. Only published
// entries are exposed; `contenu` was sanitized at write time.
export const GET: RequestHandler = async () => {
  return json(await listPublishedChangelogEntries(), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
};
