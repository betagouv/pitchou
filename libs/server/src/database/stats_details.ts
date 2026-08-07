import type { Knex } from "knex";
import type { BiodiversiteImpactStats, ConformiteStats } from "@pitchou/types/API_Pitchou.ts";

export async function getConformiteStats(
  transaction: Knex.Transaction | Knex,
  controlesP: Knex.QueryBuilder,
): Promise<ConformiteStats> {
  const counts = transaction
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
  const result = await transaction
    .from(lastControle.as("dc"))
    .join(counts.as("nc"), "dc.prescription", "nc.prescription")
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
  return {
    nonConformePrescriptionCount: Number(result.non_conforme_prescription_count),
    tooLatePrescriptionCount: Number(result.too_late_prescription_count),
    prescriptionConformeAfterFirstControleCount: Number(
      result.prescription_conforme_after_first_controle_count,
    ),
    prescriptionConformeAfterSecondControleCount: Number(
      result.prescription_conforme_after_second_controle_count,
    ),
    prescriptionConformeAfterThirdControleCount: Number(
      result.prescription_conforme_after_third_controle_count,
    ),
    prescriptionReturnedToConformiteCount: Number(result.prescription_returned_to_conformite_count),
  };
}

export async function getBiodiversiteImpactStats(
  transaction: Knex.Transaction | Knex,
  controllablePrescriptionsP: Knex.QueryBuilder,
): Promise<BiodiversiteImpactStats> {
  const conforme = transaction
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
    .from(conforme.as("conforme_prescriptions"))
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
  return {
    conformePrescriptionCount: Number(result.conforme_prescription_count),
    avoidedSurfaceTotal: Number(result.avoided_surface_total),
    compensatedSurfaceTotal: Number(result.compensated_surface_total),
    avoidedNidsCount: Number(result.avoided_nids_count),
    compensatedNidsCount: Number(result.compensated_nids_count),
    avoidedIndividusCount: Number(result.avoided_individus_count),
    compensatedIndividusCount: Number(result.compensated_individus_count),
  };
}
