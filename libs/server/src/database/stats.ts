import type { Knex } from "knex";
import { createTransaction } from "../database.ts";
import { formatISO, startOfToday } from "date-fns";

import type {
  PublicStats,
  ConformiteStats,
  BiodiversiteImpactStats,
} from "@pitchou/types/API_Pitchou.ts";

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

/**
 * Fetches the statistics related to the distribution of prescriptions
 * according to the conformity of their last contrôle.
 */
async function getConformiteStats(
  transaction: Knex.Transaction | Knex,
  controlesP: Knex.QueryBuilder,
): Promise<ConformiteStats> {
  const controleCounts = transaction
    .from(controlesP.as("controle"))
    .select("prescription")
    .count("* as controle_count")
    .groupBy("prescription");

  const lastControle = transaction
    .from(controlesP.as("controle"))
    .select("prescription", "result", "controle_date")
    .distinctOn("prescription")
    .orderBy([
      { column: "prescription", order: "asc" },
      { column: "controle_date", order: "desc" },
    ]);

  const sqlQueryResults = await transaction
    .from(lastControle.as("dc"))
    .join(controleCounts.as("nc"), "dc.prescription", "nc.prescription")
    .select([
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.result = 'Non conforme') AS non_conforme_prescription_count`,
      ),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.result = 'Trop tard') AS too_late_prescription_count`,
      ),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.result = 'Conforme' AND nc.controle_count = 1) AS prescription_conforme_after_first_controle_count`,
      ),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.result = 'Conforme' AND nc.controle_count = 2) AS prescription_conforme_after_second_controle_count`,
      ),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.result = 'Conforme' AND nc.controle_count = 3) AS prescription_conforme_after_third_controle_count`,
      ),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.result = 'Conforme' AND nc.controle_count > 1) AS prescription_returned_to_conformite_count`,
      ),
    ])
    .first();

  const stats: ConformiteStats = {
    nonConformePrescriptionCount: Number(sqlQueryResults.non_conforme_prescription_count),
    tooLatePrescriptionCount: Number(sqlQueryResults.too_late_prescription_count),
    prescriptionConformeAfterFirstControleCount: Number(
      sqlQueryResults.prescription_conforme_after_first_controle_count,
    ),
    prescriptionConformeAfterSecondControleCount: Number(
      sqlQueryResults.prescription_conforme_after_second_controle_count,
    ),
    prescriptionConformeAfterThirdControleCount: Number(
      sqlQueryResults.prescription_conforme_after_third_controle_count,
    ),
    prescriptionReturnedToConformiteCount: Number(
      sqlQueryResults.prescription_returned_to_conformite_count,
    ),
  };

  return stats;
}

/**
 * Fetches the biodiversity impact statistics for prescriptions having at least one conforme contrôle.
 */
async function getBiodiversiteImpactStats(
  transaction: Knex.Transaction | Knex,
  controllablePrescriptionsP: Knex.QueryBuilder,
): Promise<BiodiversiteImpactStats> {
  const subQuery = transaction
    .from(controllablePrescriptionsP.as("p"))
    .join("controle", "p.id", "controle.prescription")
    .where("controle.result", "Conforme")
    .distinctOn("p.id")
    .select(
      "p.id",
      "p.avoided_surface",
      "p.compensated_surface",
      "p.avoided_nids",
      "p.compensated_nids",
      "p.avoided_individus",
      "p.compensated_individus",
    )
    .orderBy([
      { column: "p.id", order: "asc" },
      { column: "controle.controle_date", order: "desc" },
    ]);

  const result = await transaction
    .from(subQuery.as("conforme_prescriptions"))
    .select([
      transaction.raw("COUNT(*)::int AS conforme_prescription_count"),
      transaction.raw("SUM(COALESCE(avoided_surface, 0))::float AS avoided_surface_total"),
      transaction.raw("SUM(COALESCE(compensated_surface, 0))::float AS compensated_surface_total"),
      transaction.raw("SUM(COALESCE(avoided_nids, 0))::int AS avoided_nids_count"),
      transaction.raw("SUM(COALESCE(compensated_nids, 0))::int AS compensated_nids_count"),
      transaction.raw("SUM(COALESCE(avoided_individus, 0))::int AS avoided_individus_count"),
      transaction.raw(
        "SUM(COALESCE(compensated_individus, 0))::int AS compensated_individus_count",
      ),
    ])
    .first();

  const stats: BiodiversiteImpactStats = {
    conformePrescriptionCount: Number(result.conforme_prescription_count),
    avoidedSurfaceTotal: Number(result.avoided_surface_total),
    compensatedSurfaceTotal: Number(result.compensated_surface_total),
    avoidedNidsCount: Number(result.avoided_nids_count),
    compensatedNidsCount: Number(result.compensated_nids_count),
    avoidedIndividusCount: Number(result.avoided_individus_count),
    compensatedIndividusCount: Number(result.compensated_individus_count),
  };

  return stats;
}
