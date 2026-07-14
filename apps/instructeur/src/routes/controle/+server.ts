import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import {
  ajouterControles,
  modifierControle,
  getDossierIdFromControle,
} from "@pitchou/server/database/controle.ts";
import { getDossierIdFromPrescription } from "@pitchou/server/database/prescription.ts";
import type Controle from "@pitchou/types/database/public/Controle.ts";

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const controleData = (await request.json()) as Partial<Controle>;

  let dossierId;
  if (controleData.id) {
    dossierId = await getDossierIdFromControle(controleData.id);
  } else if (controleData.prescription) {
    dossierId = await getDossierIdFromPrescription(controleData.prescription);
  }
  await requireDossierAccessByCap(dossierId, cap);

  try {
    const controleId = controleData.id
      ? await modifierControle(controleData)
      : await ajouterControles(controleData);
    return json(controleId);
  } catch (err) {
    error(500, `Erreur lors de l'ajout/modification de contrôle. ${err}`);
  }
};
