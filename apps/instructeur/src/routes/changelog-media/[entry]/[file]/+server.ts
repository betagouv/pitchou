import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { changelogMediaResponse } from "@pitchou/server/changelogMedia.ts";

// Media embedded in changelog entries. Public like the « Nouveautés » page that
// displays them; file names are unguessable uuids and responses cache hard.
export const GET: RequestHandler = async ({ params }) => {
  const response = await changelogMediaResponse(params.entry, params.file);
  if (!response) {
    error(404, "Média introuvable");
  }
  return response;
};
