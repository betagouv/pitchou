import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import { requireUserId, requireDossierAccess } from "$lib/server/auth";
import { addPrescriptionsEtControles } from "@pitchou/server/database/prescription.ts";
import { getDossierIdFromDecisionAdministrative } from "@pitchou/server/database/decision_administrative.ts";
import { logDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { getUserById } from "@pitchou/server/database/personne.ts";
import type { ActionDossierInitializer } from "@pitchou/types/database/public/ActionDossier.ts";
import type { FrontEndPrescription } from "@pitchou/types/API_Pitchou.ts";

export const POST: RequestHandler = async ({ request, locals }) => {
  const userId = requireUserId(locals);
  const prescriptionData = (await request.json()) as Omit<FrontEndPrescription, "id">[];

  const actions: ActionDossierInitializer[] = [];
  for (const prescription of prescriptionData) {
    const dossierId = await getDossierIdFromDecisionAdministrative(
      prescription.decision_administrative,
    );
    const authorizedDossierId = await requireDossierAccess(dossierId, userId);
    actions.push({
      dossier: authorizedDossierId,
      type: "prescription_ajoutee",
      data: { article_number: prescription.article_number ?? null },
    });
    for (const controle of prescription.controles ?? []) {
      actions.push({
        dossier: authorizedDossierId,
        type: "controle_ajoute",
        data: { result: controle.result ?? null },
      });
    }
  }

  try {
    await directDatabaseConnection.transaction(async (transaction) => {
      const author = await getUserById(userId, transaction);
      await addPrescriptionsEtControles(prescriptionData, transaction);
      await logDossierActions(
        actions.map((action) => ({ ...action, author_personne: author?.id ?? null })),
        transaction,
      );
    });
  } catch (err) {
    error(400, `Erreur lors de l'ajout/modification de prescription. ${err}`);
  }

  return new Response(null, { status: 204 });
};
