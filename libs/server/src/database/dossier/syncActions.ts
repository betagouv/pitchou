import type { Knex } from "knex";
import type { DossierForUpdate } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type { ActionDossierInitializer } from "@pitchou/types/database/public/ActionDossier.ts";
import type { default as Dossier, DossierId } from "@pitchou/types/database/public/Dossier.ts";
import { applicantFieldLabels } from "@pitchou/types/notification.ts";

/**
 * Columns the synchronization writes back but that are not facts of the
 * pétitionnaire: identifiers and technical columns, and the annotations owned by
 * the instructeurs, which travel to Démarche Numérique and come back unchanged.
 * Their own historique is written where an instructeur edits them.
 */
const notPetitionnaireColumns: Set<string> = new Set([
  "id",
  "demarche_numerique_id",
  "demarche_numerique_number",
  "demarche_number",
  "source",
  "depot_date",
  "deposant",
  "demandeur_personne_physique",
  // Company properties are diffed before their shared row is overwritten.
  "demandeur_personne_morale",
  // Diffed apart, as an « espèces impactées » entry rather than a champ.
  "especes_impactees",
  // Instruction annotations
  "free_comment",
  "ddep_required",
  "er_mesures_sufficient",
  "onagre_demande_identifier",
  "next_action_expected_from",
  "next_action_expected",
  "next_due_date",
  "enjeu",
  "public_consultation_start_date",
  "public_consultation_end_date",
]);

/**
 * The calendar day a Date stands for, in the zone the process runs in. Postgres
 * returns a `date` column as local midnight while Démarche Numérique sends the
 * same day as a "YYYY-MM-DD" string: rendering the Date in UTC would move it to
 * the day before in any positive offset, and every synchronization would then
 * report an unchanged date as modified.
 */
function toLocalDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function normalize(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return toLocalDay(value);
  if (typeof value === "object") {
    // JSONB reorders object keys; that is not an applicant edit.
    return JSON.stringify(value, (_key, item) =>
      item && typeof item === "object" && !Array.isArray(item)
        ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
        : item,
    );
  }
  return String(value);
}

/** Long texts and maps are kept as an excerpt: the historique shows a change, not a diff. */
function excerpt(value: unknown): string | null {
  const text = normalize(value);
  if (!text) return null;
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

export type SyncActionsResult = {
  actions: ActionDossierInitializer[];
  /** Dossiers whose pétitionnaire data actually changed, to notify their followers. */
  changedDossiers: Set<DossierId>;
};

/**
 * Diffs the dossiers the synchronization is about to update against their current
 * rows. Every column carried by the update is compared, except the ones above, so
 * the historique records exactly which champs the pétitionnaire changed instead of
 * flagging the whole dossier as modified.
 */
export async function actionsFromSyncUpdates(
  dossiersForUpdate: DossierForUpdate[],
  db: Knex.Transaction | Knex,
): Promise<SyncActionsResult> {
  const empty: SyncActionsResult = { actions: [], changedDossiers: new Set() };
  if (dossiersForUpdate.length === 0) return empty;

  const numbers = dossiersForUpdate
    .map(({ dossier }) => dossier.demarche_numerique_number)
    .filter((number) => number != null);
  if (numbers.length === 0) return empty;

  const comparedColumns = new Set(
    dossiersForUpdate.flatMap(({ dossier }) =>
      Object.keys(dossier).filter((column) => !notPetitionnaireColumns.has(column)),
    ),
  );

  const currentRows: Partial<Dossier>[] = await db("dossier")
    .select([
      "id",
      "demarche_numerique_number",
      "especes_impactees",
      ...[...comparedColumns].map((column) => `dossier.${column}`),
    ])
    .whereIn("demarche_numerique_number", numbers)
    .where("source", "demarche_numerique");
  const currentByNumber = new Map(currentRows.map((row) => [row.demarche_numerique_number, row]));

  const actions: ActionDossierInitializer[] = [];
  const changedDossiers = new Set<DossierId>();
  for (const { dossier: update } of dossiersForUpdate) {
    const current = currentByNumber.get(update.demarche_numerique_number ?? undefined);
    if (!current?.id) continue;

    for (const column of Object.keys(update) as (keyof Dossier)[]) {
      if (notPetitionnaireColumns.has(column)) continue;
      const before = current[column];
      const after = update[column];
      if (after === undefined) continue;
      if (normalize(after) === normalize(before)) continue;
      actions.push({
        dossier: current.id,
        type: "champ_modifie",
        data: {
          field: applicantFieldLabels[column] ?? column,
          column,
          notification: true,
          from: excerpt(before),
          to: excerpt(after),
        },
        author_petitionnaire: true,
      });
      changedDossiers.add(current.id);
    }

    if (
      update.especes_impactees !== undefined &&
      normalize(update.especes_impactees) !== normalize(current.especes_impactees)
    ) {
      actions.push({
        dossier: current.id,
        type: "especes_renseignees",
        data: { field: "especes", label: "Espèces impactées", notification: true },
        author_petitionnaire: true,
      });
      changedDossiers.add(current.id);
    }
  }
  return { actions, changedDossiers };
}
