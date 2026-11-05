import { error, json } from "@sveltejs/kit";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { loadFieldExamples } from "@pitchou/server/onagre/examples.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
  const result = await loadFieldExamples(db, url);
  if (!result) error(404, "Champ ou dump introuvable.");
  return json(result, { headers: { "cache-control": "no-store" } });
};
