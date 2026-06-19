import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap } from "$lib/server/auth";
import { getDossiersRésumésByCap } from "@pitchou/server/database/dossier.ts";

export const GET: RequestHandler = async ({ url }) => {
  const cap = requireCap(url);
  return json(await getDossiersRésumésByCap(cap));
};
