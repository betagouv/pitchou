import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import { getDossierMessages } from "$server/database/dossier.ts";
import type { DossierId } from "$types/database/public/Dossier.ts";

export const GET: RequestHandler = async ({ params, url }) => {
  const cap = requireCap(url);
  const dossierId = await requireDossierAccessByCap(Number(params.dossierId!) as DossierId, cap);
  return json(await getDossierMessages(dossierId));
};
