import type { Knex } from "knex";
import type { default as Activite } from "@pitchou/types/database/public/Activite.ts";
import type { default as ActiviteGroupe } from "@pitchou/types/database/public/ActiviteGroupe.ts";
import type { default as ActiviteLabel } from "@pitchou/types/database/public/ActiviteLabel.ts";
import { directDatabaseConnection } from "./connection.ts";

/**
 * The generated table types with their key columns widened back to `string`, so rows written by
 * hand (endpoints, tests) satisfy them too. Same rationale as in
 * `referentielTypeImpactMethodeMoyenDePoursuite.ts`.
 */
export type ActiviteRow = Omit<Activite, "code" | "groupe_code"> & {
  code: string;
  groupe_code: string;
};
export type ActiviteGroupeRow = Omit<ActiviteGroupe, "code"> & { code: string };
export type ActiviteLabelRow = Omit<ActiviteLabel, "label" | "activite_code"> & {
  label: string;
  activite_code: string;
};

export type ActiviteReferentiel = {
  groupes: ActiviteGroupeRow[];
  activites: ActiviteRow[];
  labels: ActiviteLabelRow[];
};

/** Activity every label unknown to the referentiel is parked under, pending admin review. */
export { AUTRE_ACTIVITE_CODE } from "@pitchou/common/activiteCodes.ts";
import { AUTRE_ACTIVITE_CODE } from "@pitchou/common/activiteCodes.ts";

/**
 * Resolved activity of a dossier, derived from its raw `main_activite` label. Attached to dossier
 * payloads by the list queries (see `withResolvedActivite`).
 */
export type ResolvedActiviteColumns = {
  activite_code: string | null;
  activite_label: string | null;
};

/**
 * Completes the resolved activity of a dossier row read with the activite joins (which only match
 * reviewed labels): a raw label the referentiel has not classified yet — unknown or still parked
 * pending review — resolves to the « autre » code for filters and business rules, but keeps its
 * raw label for display so no information is lost before an administrator groups it.
 */
export function withResolvedActivite<
  Row extends { main_activite: string | null } & ResolvedActiviteColumns,
>(row: Row): Row {
  if (row.main_activite && !row.activite_code) {
    row.activite_code = AUTRE_ACTIVITE_CODE;
    row.activite_label = row.main_activite;
  }
  return row;
}

export async function getActiviteReferentiel(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<ActiviteReferentiel> {
  const [groupes, activites, labels] = await Promise.all([
    databaseConnection("activite_groupe").select("*").orderBy("label"),
    databaseConnection("activite").select("*").orderBy("label"),
    databaseConnection("activite_label").select("*").orderBy("label"),
  ]);

  return { groupes, activites, labels };
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
  groupeCode: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await databaseConnection("activite").insert({ code, label, groupe_code: groupeCode });
  await registerCanonicalLabel(code, label, databaseConnection);
}

/** Returns false when no group has this code. */
export async function renameActiviteGroupe(
  code: string,
  label: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<boolean> {
  const updated = await databaseConnection("activite_groupe").where({ code }).update({ label });
  return updated > 0;
}

/** Moves an activity to another group. Returns false when no activity has this code. */
export async function setActiviteGroupe(
  code: string,
  groupeCode: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<boolean> {
  const updated = await databaseConnection("activite")
    .where({ code })
    .update({ groupe_code: groupeCode });
  return updated > 0;
}

/** Returns false when no activity has this code. */
export async function renameActivite(
  code: string,
  label: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<boolean> {
  const updated = await databaseConnection("activite").where({ code }).update({ label });
  if (updated > 0) await registerCanonicalLabel(code, label, databaseConnection);
  return updated > 0;
}

/**
 * Keeps the display name of an activity resolvable as a label: dossiers created in Pitchou store
 * the name the form offered, so every current or past display name must have a row here. Former
 * names keep their row (dossiers may carry them). A label still parked pending review is adopted
 * by the activity; a reviewed mapping is never overridden — the endpoints reject those name
 * conflicts upfront (see `findActiviteLabelConflict`).
 */
async function registerCanonicalLabel(
  code: string,
  label: string,
  databaseConnection: Knex.Transaction | Knex,
): Promise<void> {
  const adopted = await databaseConnection("activite_label")
    .where({ label, needs_review: true })
    .update({ activite_code: code, needs_review: false });
  if (adopted > 0) return;

  await databaseConnection("activite_label")
    .insert({ label, activite_code: code, needs_review: false })
    .onConflict("label")
    .ignore();
}

/**
 * Reports whether naming (or renaming) the activity `code` as `label` would collide with the
 * referentiel: the display name of another activity, or a reviewed label grouped under another
 * activity. Parked labels (`needs_review`) do not conflict — creating or renaming an activity
 * with their name adopts them (see `registerCanonicalLabel`).
 */
export function findActiviteLabelConflict(
  referentiel: ActiviteReferentiel,
  code: string,
  label: string,
): boolean {
  return (
    referentiel.activites.some((activite) => activite.label === label && activite.code !== code) ||
    referentiel.labels.some(
      (row) => row.label === label && !row.needs_review && row.activite_code !== code,
    )
  );
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
