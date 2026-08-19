import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { changelogMediaResponse } from "@pitchou/server/changelogMedia.ts";

// Media embedded in changelog entries, for the admin editor. The hooks already
// require an admin session; the public equivalent lives in the instructeur app.
export const GET: RequestHandler = async ({ params }) => {
  const response = await changelogMediaResponse(params.entry, params.file);
  if (!response) {
    error(404, "Média introuvable");
  }
  return response;
};
