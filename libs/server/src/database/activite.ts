import type { Knex } from "knex";
import type { default as Activite } from "@pitchou/types/database/public/Activite.ts";
import type { default as ActiviteLabel } from "@pitchou/types/database/public/ActiviteLabel.ts";
import { directDatabaseConnection } from "./connection.ts";

/**
 * The generated table types with their key columns widened back to `string`, so rows written by
 * hand (endpoints, tests) satisfy them too. Same rationale as in
 * `referentielTypeImpactMethodeMoyenDePoursuite.ts`.
 */
export type ActiviteRow = Omit<Activite, "code"> & { code: string };
export type ActiviteLabelRow = Omit<ActiviteLabel, "label" | "activite_code"> & {
  label: string;
  activite_code: string;
};

export type ActiviteReferentiel = {
  activites: ActiviteRow[];
  labels: ActiviteLabelRow[];
};

/** Activity every label unknown to the referentiel is parked under, pending admin review. */
export const AUTRE_ACTIVITE_CODE = "autre";

export async function getActiviteReferentiel(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<ActiviteReferentiel> {
  const [activites, labels] = await Promise.all([
    databaseConnection("activite").select("*").orderBy("label"),
    databaseConnection("activite_label").select("*").orderBy("label"),
  ]);

  return { activites, labels };
}

/**
 * Registers raw « Activité principale » labels encountered during a synchronization. Labels
 * already in the referentiel are left untouched; new ones are parked under the "autre" activity
 * with `needs_review` set, so administrators are prompted to group them properly.
 */
export async function registerActiviteLabels(
  labels: string[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  if (labels.length === 0) return;

  await databaseConnection("activite_label")
    .insert(
      labels.map((label) => ({
        label,
        activite_code: AUTRE_ACTIVITE_CODE,
        needs_review: true,
      })),
    )
    .onConflict("label")
    .ignore();
}

export async function createActivite(
  code: string,
  label: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await databaseConnection("activite").insert({ code, label });
}

/** Returns false when no activity has this code. */
export async function renameActivite(
  code: string,
  label: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<boolean> {
  const updated = await databaseConnection("activite").where({ code }).update({ label });
  return updated > 0;
}

/**
 * Groups a label under another activity and marks it as reviewed. Accepting a flagged label as
 * « Autre » is the same operation with `activiteCode` set to its current activity.
 * Returns false when the label is not in the referentiel.
 */
export async function reassignActiviteLabel(
  label: string,
  activiteCode: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<boolean> {
  const updated = await databaseConnection("activite_label")
    .where({ label })
    .update({ activite_code: activiteCode, needs_review: false });
  return updated > 0;
}
