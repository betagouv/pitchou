import type { Knex } from "knex";
import type { DossierForUpdate } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type { ActionDossierInitializer } from "@pitchou/types/database/public/ActionDossier.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";

/**
 * Pétitionnaire-form columns whose change is worth an historique entry, with
 * the label shown in the front. Annotation-derived columns (free comment,
 * DDEP, Onagre…) are written by instructeurs and tracked at their endpoints.
 */
const trackedColumns: Partial<Record<keyof Dossier, string>> = {
  name: "Nom du projet",
  description: "Description",
  main_activite: "Activité principale",
  motif_derogation: "Motif de la dérogation",
  motif_derogation_justification: "Synthèse des éléments justifiant le motif de la dérogation",
  no_other_satisfactory_solution_justification:
    "Synthèse des éléments démontrant qu'il n'existe aucune alternative",
  intervention_start_date: "Date de début d'intervention ou des travaux",
  intervention_end_date: "Date de fin d'intervention ou des travaux",
  intervention_duration: "Durée de la dérogation",
  commissioning_date: "Date de mise en service de l'exploitation",
  communes: "Communes du projet",
  departments: "Départements du projet",
  ecological_inventory_completed: "État des lieux écologique",
  especes_present_in_influence_area: "Présence d'espèces protégées dans l'aire d'influence",
  risk_despite_erc_mesures: "Risque malgré les mesures d'évitement et de réduction",
  urgent_contact_phone: "Téléphone en cas de demande urgente",
  linked_to_ae_regime: "Rattachement au régime AE",
  // Siret of the demandeur entreprise: a change means another entreprise carries
  // the dossier. Its content and the identities are diffed in identite_dossier.ts.
  demandeur_personne_morale: "Entreprise",
};

function normalize(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Diffs the dossiers the synchronization is about to update against their
 * current rows, producing pétitionnaire historique actions: one per changed
 * form field, plus a dedicated entry when the espèces impactées file changed.
 */
export async function actionsFromSyncUpdates(
  dossiersForUpdate: DossierForUpdate[],
  db: Knex.Transaction | Knex,
): Promise<ActionDossierInitializer[]> {
  if (dossiersForUpdate.length === 0) return [];

  const numbers = dossiersForUpdate
    .map(({ dossier }) => dossier.demarche_numerique_number)
    .filter((number) => number != null);
  if (numbers.length === 0) return [];

  const currentRows: Partial<Dossier>[] = await db("dossier")
    .select([
      "id",
      "demarche_numerique_number",
      "especes_impactees",
      ...Object.keys(trackedColumns),
    ])
    .whereIn("demarche_numerique_number", numbers)
    .where("source", "demarche_numerique");
  const currentByNumber = new Map(currentRows.map((row) => [row.demarche_numerique_number, row]));

  const actions: ActionDossierInitializer[] = [];
  for (const { dossier: update } of dossiersForUpdate) {
    const current = currentByNumber.get(update.demarche_numerique_number ?? undefined);
    if (!current?.id) continue;

    for (const [column, field] of Object.entries(trackedColumns) as [keyof Dossier, string][]) {
      if (!(column in update)) continue;
      if (normalize(update[column]) === normalize(current[column])) continue;
      actions.push({
        dossier: current.id,
        type: "champ_modifie",
        data: { field },
        author_petitionnaire: true,
      });
    }

    if (
      "especes_impactees" in update &&
      normalize(update.especes_impactees) !== normalize(current.especes_impactees)
    ) {
      actions.push({
        dossier: current.id,
        type: "especes_renseignees",
        data: {},
        author_petitionnaire: true,
      });
    }
  }
  return actions;
}
