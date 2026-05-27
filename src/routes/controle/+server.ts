import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import {
  ajouterContrôles,
  modifierContrôle,
  getDossierIdFromControle,
} from "$server/database/controle.js";
import { getDossierIdFromPrescription } from "$server/database/prescription.js";
import type Contrôle from "$types/database/public/Contrôle.ts";

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const controleData = (await request.json()) as Partial<Contrôle>;

  let dossierId;
  if (controleData.id) {
    dossierId = await getDossierIdFromControle(controleData.id);
  } else if (controleData.prescription) {
    dossierId = await getDossierIdFromPrescription(controleData.prescription);
  }
  await requireDossierAccessByCap(dossierId, cap);

  try {
    const controleId = controleData.id
      ? await modifierContrôle(controleData)
      : await ajouterContrôles(controleData);
    return json(controleId);
  } catch (err) {
    error(500, `Erreur lors de l'ajout/modification de contrôle. ${err}`);
  }
};
