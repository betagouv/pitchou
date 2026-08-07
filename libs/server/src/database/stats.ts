import { createTransaction } from "../database.ts";
import { formatISO, startOfToday } from "date-fns";
import { getBiodiversiteImpactStats, getConformiteStats } from "./stats_details.ts";

import type { PublicStats } from "@pitchou/types/API_Pitchou.ts";

/**
 * Computes Pitchou's public statistics
 */
export async function getPublicStats(): Promise<PublicStats> {
  const transaction = await createTransaction({ readOnly: true });
  const today = formatISO(startOfToday());
  try {
    // Fetch all the dossiers
    const allDossiersP = transaction("dossier").select("id");

    // Fetch the dossiers currently in the contrôle phase
    const controlePhaseDossiersP = transaction("evenement_phase_dossier")
      .select("dossier")
      .max("timestamp as latest_timestamp")
      .where("phase", "Contrôle")
      .groupBy("dossier")
      .orderBy("latest_timestamp", "desc");

    const petitionnairesSinceSeptember2024P = transaction("dossier")
      .select(["demandeur_personne_morale", "demandeur_personne_physique"])
      .where("depot_date", ">=", "2024-09-01")
      .groupBy("demandeur_personne_morale", "demandeur_personne_physique");

    /** The prescriptions we're interested in are the controllable prescriptions, i.e. the prescriptions whose due date is in the past */
    const controllablePrescriptionsP = transaction("prescription")
      .select([
        "id",
        "avoided_surface",
        "compensated_surface",
        "avoided_nids",
        "compensated_nids",
        "avoided_individus",
        "compensated_individus",
      ])
      .where("due_date", "<=", today)
      .as("p");

    const controlesP = transaction
      .select(["controle.prescription", "controle.result", "controle.controle_date"])
      .from("controle")
      .join(controllablePrescriptionsP, "controle.prescription", "p.id")
      .as("c");

    const prescriptionWithControleCountP = transaction
      .from(controlesP)
      .countDistinct("prescription as count")
      .first();

    const biodiversiteImpactStatsP = getBiodiversiteImpactStats(
      transaction,
      controllablePrescriptionsP,
    );

    const conformiteStatsP = getConformiteStats(transaction, controlesP);

    const [
      allDossiers,
      controlePhaseDossiers,
      petitionnairesSinceSeptember2024,
      conformiteStats,
      controllablePrescriptions,
      prescriptionWithControleCountRow,
      biodiversiteImpactStats,
    ] = await Promise.all([
      allDossiersP,
      controlePhaseDossiersP,
      petitionnairesSinceSeptember2024P,
      conformiteStatsP,
      controllablePrescriptionsP,
      prescriptionWithControleCountP,
      biodiversiteImpactStatsP,
    ]);

    const controllablePrescriptionCount = controllablePrescriptions.length;
    const prescriptionWithControleCount = Number(prescriptionWithControleCountRow?.count);

    const controlePhaseDossierIds = controlePhaseDossiers.map((row) => row.dossier);

    // Fetch the décisions administratives for the dossiers in the Controle phase
    const controlePhaseDossiersWithDecision = await transaction("evenement_phase_dossier as epd")
      .join("decision_administrative as da", "da.dossier", "epd.dossier")
      .whereIn("epd.dossier", controlePhaseDossierIds)
      .whereNotNull("da.type")
      .distinct("epd.dossier")
      .select("epd.dossier");

    const stats: PublicStats = {
      dossierCount: allDossiers.length,
      controlePhaseDossierCount: controlePhaseDossiers.length,
      controlePhaseDossierWithDecisionCount: controlePhaseDossiersWithDecision.length,
      controlePhaseDossierWithoutDecisionCount:
        controlePhaseDossiers.length - controlePhaseDossiersWithDecision.length,
      petitionnaireCountSinceSeptember2024: petitionnairesSinceSeptember2024.length,
      controllablePrescriptionCount,
      prescriptionWithControleCount,
      conformiteStats,
      biodiversiteImpactStats,
    };

    await transaction.commit();
    return stats;
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
}
