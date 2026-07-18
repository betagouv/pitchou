import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import { addPrescriptionsEtControles } from "@pitchou/server/database/prescription.ts";
import { getDossierIdFromDecisionAdministrative } from "@pitchou/server/database/decision_administrative.ts";
import type { FrontEndPrescription } from "@pitchou/types/API_Pitchou.ts";

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const prescriptionData = (await request.json()) as Omit<FrontEndPrescription, "id">[];

  for (const prescription of prescriptionData) {
    const dossierId = await getDossierIdFromDecisionAdministrative(
      prescription.décision_administrative,
    );
    await requireDossierAccessByCap(dossierId, cap);
  }

  try {
    await addPrescriptionsEtControles(prescriptionData);
    return new Response(null, { status: 204 });
  } catch (err) {
    error(400, `Erreur lors de l'ajout/modification de prescription. ${err}`);
  }
};
