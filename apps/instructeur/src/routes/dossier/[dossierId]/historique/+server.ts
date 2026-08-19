import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth.ts";
import { getDossierActions } from "@pitchou/server/database/action_dossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

export const GET: RequestHandler = async ({ params, url }) => {
  const cap = requireCap(url);
  const dossierId = await requireDossierAccessByCap(Number(params.dossierId!) as DossierId, cap);
  return json(await getDossierActions(dossierId));
};
