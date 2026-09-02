import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import { addPrescriptionsEtControles } from "@pitchou/server/database/prescription.ts";
import { getDossierIdFromDecisionAdministrative } from "@pitchou/server/database/decision_administrative.ts";
import { logDossierActionsAfterCommit } from "@pitchou/server/database/action_dossier.ts";
import { getPersonneByDossierCap } from "@pitchou/server/database/personne.ts";
import type { ActionDossierInitializer } from "@pitchou/types/database/public/ActionDossier.ts";
import type { FrontEndPrescription } from "@pitchou/types/API_Pitchou.ts";

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const prescriptionData = (await request.json()) as Omit<FrontEndPrescription, "id">[];

  const author = await getPersonneByDossierCap(cap);
  const actions: ActionDossierInitializer[] = [];
  for (const prescription of prescriptionData) {
    const dossierId = await getDossierIdFromDecisionAdministrative(
      prescription.decision_administrative,
    );
    const authorizedDossierId = await requireDossierAccessByCap(dossierId, cap);
    actions.push({
      dossier: authorizedDossierId,
      type: "prescription_ajoutee",
      data: { article_number: prescription.article_number ?? null },
      author_personne: author?.id ?? null,
    });
    for (const controle of prescription.controles ?? []) {
      actions.push({
        dossier: authorizedDossierId,
        type: "controle_ajoute",
        data: { result: controle.result ?? null },
        author_personne: author?.id ?? null,
      });
    }
  }

  try {
    await addPrescriptionsEtControles(prescriptionData);
  } catch (err) {
    error(400, `Erreur lors de l'ajout/modification de prescription. ${err}`);
  }

  await logDossierActionsAfterCommit(actions);
  return new Response(null, { status: 204 });
};
