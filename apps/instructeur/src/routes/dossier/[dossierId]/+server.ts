import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import { getDossierComplet, updateDossier } from "@pitchou/server/database/dossier.ts";
import { getPersonneByDossierCap } from "@pitchou/server/database/personne.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

function parseDossierId(raw: string): DossierId {
  const id = Number(raw);
  if (!Number.isFinite(id)) {
    error(400, "dossierId invalide");
  }
  return id as DossierId;
}

export const GET: RequestHandler = async ({ params, url }) => {
  const cap = requireCap(url);
  const dossierId = parseDossierId(params.dossierId!);

  const dossier = await getDossierComplet(dossierId, cap);
  if (!dossier) {
    error(403, `Aucun dossier trouvé avec id '${dossierId}'`);
  }

  return json(dossier);
};

export const POST: RequestHandler = async ({ params, url, request }) => {
  const cap = requireCap(url);
  const dossierId = await requireDossierAccessByCap(parseDossierId(params.dossierId!), cap);

  const capPersonne = await getPersonneByDossierCap(cap);
  if (!capPersonne) {
    error(403, "Personne associée à la cap introuvable");
  }

  const body = await request.json();
  const updated = await updateDossier(dossierId, body, capPersonne.id);
  return json(updated);
};
