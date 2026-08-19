import type { ActionDossierInitializer } from "@pitchou/types/database/public/ActionDossier.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { PersonneId } from "@pitchou/types/database/public/Personne.ts";
import type EvenementPhaseDossier from "@pitchou/types/database/public/EvenementPhaseDossier.ts";

type DossierUpdate = Partial<Dossier & { evenementsPhase: EvenementPhaseDossier[] }>;

function isoDay(date: Date | string | null | undefined): string | null {
  return date ? new Date(date).toISOString().slice(0, 10) : null;
}

function ddepLabel(update: DossierUpdate): string {
  if (update.ddep_required === true) return "Oui";
  if (update.ddep_required === false)
    return update.er_mesures_sufficient
      ? "Non, mesures Éviter, Réduire (ER) suffisantes"
      : "Non, sans objet";
  return "À déterminer";
}

/**
 * Translates a dossier update coming from the instruction form into historique
 * actions, one per touched field.
 */
export function actionsFromDossierUpdate(
  update: DossierUpdate,
  dossierId: DossierId,
  authorPersonne: PersonneId,
): ActionDossierInitializer[] {
  const actions: ActionDossierInitializer[] = [];
  const add = (type: string, data: Record<string, unknown> = {}) =>
    actions.push({ dossier: dossierId, type, data, author_personne: authorPersonne });

  const lastPhaseEvent = update.evenementsPhase?.at(-1);
  if (lastPhaseEvent) add("phase_renseignee", { value: lastPhaseEvent.phase });
  if ("next_action_expected_from" in update)
    add("prochaine_action_renseignee", { value: update.next_action_expected_from ?? null });
  if ("next_action_expected" in update)
    add("prochaine_action_attendue_renseignee", { value: update.next_action_expected ?? null });
  if ("next_due_date" in update)
    add("echeance_renseignee", { value: isoDay(update.next_due_date) });
  if ("ddep_required" in update || "er_mesures_sufficient" in update)
    add("ddep_renseignee", { value: ddepLabel(update) });
  if ("enjeu" in update) add("enjeu_renseigne", { value: update.enjeu ? "Oui" : "Non" });
  if ("onagre_demande_identifier" in update)
    add("onagre_renseigne", { value: update.onagre_demande_identifier ?? null });
  if ("public_consultation_start_date" in update || "public_consultation_end_date" in update)
    add("dates_consultation_renseignees", {
      start: isoDay(update.public_consultation_start_date),
      end: isoDay(update.public_consultation_end_date),
    });

  return actions;
}
