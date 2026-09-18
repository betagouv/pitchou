import { error } from "@sveltejs/kit";
import type { Knex } from "knex";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import { logActionsDossier } from "@pitchou/server/database/action_dossier.ts";
import { markDossiersUnreadForFollowers } from "@pitchou/server/database/notification.ts";
import { speciesImpactChangeField } from "@pitchou/common/especes/impactGroup.ts";
import { changedImpactTypes } from "@pitchou/server/database/impact_espece/changes.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type ImpactEspece from "@pitchou/types/database/public/ImpactEspece.ts";
import type ImpactType from "@pitchou/types/database/public/ImpactType.ts";
import { simulationAllowed } from "./simulation.ts";

export async function speciesSimulationGroups(
  dossierId: DossierId,
  db: Knex = directDatabaseConnection,
): Promise<{ id: string | null; label: string }[]> {
  if (!simulationAllowed()) return [];
  const groups: { id: string | null; label: string | null }[] = await db("impact_espece as impact")
    .leftJoin("impact_type as type", "type.identifiant_pitchou", "impact.impact_type")
    .where("impact.dossier", dossierId)
    .distinct("impact.impact_type as id", "type.libelle_pitchou as label")
    .orderBy("impact.impact_type");
  return groups.map(({ id, label }) => ({ id, label: label ?? "Type d'impact non renseigné" }));
}

/** Changes a stored quantity only; the original spreadsheet is deliberately untouched. */
export async function simulateSpeciesChange(
  dossierId: DossierId,
  impactType: string | null,
  db: Knex = directDatabaseConnection,
): Promise<{ changed: boolean; message: string }> {
  if (!simulationAllowed()) error(404);
  return db.transaction(async (trx) => {
    const dossier = await trx("dossier").where({ id: dossierId }).forUpdate().first();
    if (!dossier) error(404, "Dossier introuvable.");
    if (dossier.source !== "demarche_numerique" || !dossier.demarche_numerique_number) {
      error(400, "Seul un dossier venu de Démarches Numériques peut être synchronisé.");
    }
    const impact: ImpactEspece | undefined = await trx("impact_espece")
      .where({ dossier: dossierId, impact_type: impactType })
      .orderBy("id")
      .first();
    if (!impact) error(400, "Ce dossier ne contient aucune espèce dans ce groupe d'impact.");
    const reference: ImpactType | undefined = impactType
      ? await trx("impact_type").where({ identifiant_pitchou: impactType }).first()
      : undefined;
    const quantities = [
      ["surface_habitat_detruit", "Surface d'habitat détruit (m²)"],
      ["nids", "Nombre de nids"],
      ["oeufs", "Nombre d'œufs"],
      ["nombre_individus", "Nombre d'individus"],
    ] as const;
    const [column, quantityLabel] =
      quantities.find(([key]) => reference?.[`critere_${key}`]) ??
      quantities.find(([key]) => impact[key] != null) ??
      quantities[3];
    const before = impact[column];
    const value =
      column === "nombre_individus"
        ? before === "11-100"
          ? "1-10"
          : "11-100"
        : Number(before ?? 0) >= 2147483647
          ? 0
          : Number(before ?? 0) + 1;
    const updated = { ...impact, [column]: value };
    const label = reference?.libelle_pitchou ?? "Type d'impact non renseigné";
    await trx("impact_espece")
      .where({ id: impact.id })
      .update({ [column]: value, updated_at: trx.fn.now() });
    await logActionsDossier(
      changedImpactTypes([impact], [updated]).map((group) => ({
        dossier: dossierId,
        type: "especes_renseignees",
        author_petitionnaire: true,
        data: {
          field: "especes",
          notification_field: speciesImpactChangeField(group),
          label,
          notification: true,
          simulated: true,
          from: before,
          to: value,
        },
      })),
      trx,
    );
    await markDossiersUnreadForFollowers(new Map([[dossierId, new Date()]]), trx);
    return {
      changed: true,
      message: `${label} : ${quantityLabel}, ${before ?? "non renseigné"} → ${value}.`,
    };
  });
}
