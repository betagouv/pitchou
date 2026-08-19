import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";

import type { HistoriqueEntry } from "./display.ts";

/** The free-form payload an action carries, keyed by the action type. */
export type ActionData = Record<string, unknown>;

/** What a given action type says; the rest of the entry is type-independent. */
export type ActionDisplay = Omit<HistoriqueEntry, "id" | "tone" | "date" | "timeKnown">;

export const str = (data: ActionData, key: string): string | null =>
  typeof data[key] === "string" && data[key] ? (data[key] as string) : null;
const bool = (data: ActionData, key: string): boolean | null =>
  typeof data[key] === "boolean" ? (data[key] as boolean) : null;
export const emailName = (email: string | null): string | null => email?.split("@")[0] ?? null;
const day = (value: string | null): string | null =>
  value ? formatDateAbsolute(new Date(value), "dd/MM/yyyy") : null;

const displayByType: Record<string, (data: ActionData) => ActionDisplay> = {
  champ_modifie: (d) => {
    const field = str(d, "field") ?? "du formulaire";
    // A champ that had no value was filled in; one that had a value was changed.
    return {
      icon: "fr-icon-pencil-line",
      label: `Champ ${field} ${str(d, "from") ? "modifié" : "renseigné"}${str(d, "to") ? " :" : ""}`,
      value: str(d, "to") ?? undefined,
    };
  },
  especes_renseignees: () => ({
    icon: "fr-icon-leaf-line",
    label: "Espèces impactées renseignées",
  }),
  piece_jointe_importee: (d) => ({
    icon: "fr-icon-attachment-line",
    label: "Pièce jointe importée :",
    value: str(d, "name") ?? undefined,
  }),
  dossier_suivi: (d) => ({
    icon: "fr-icon-star-fill",
    label: "Dossier suivi par",
    value: emailName(str(d, "follower")) ?? "?",
  }),
  dossier_suivi_termine: (d) => ({
    icon: "fr-icon-star-line",
    label: "Dossier cessé d'être suivi par",
    value: emailName(str(d, "follower")) ?? "?",
  }),
  dossier_partage: (d) => ({
    icon: "fr-icon-eye-line",
    label: "Dossier partagé en lecture seule avec",
    value: str(d, "groupe") ?? "?",
  }),
  dossier_partage_termine: (d) => ({
    icon: "fr-icon-eye-off-line",
    label: "Partage en lecture seule retiré à",
    value: str(d, "groupe") ?? "?",
  }),
  dates_consultation_renseignees: (d) => {
    const base = {
      icon: "fr-icon-calendar-line",
      label: "Dates de consultation du public renseignées :",
    };
    const start = day(str(d, "start")) ?? "?";
    const end = day(str(d, "end")) ?? "?";
    // Only the date that changed is bold; actions recorded before the flags
    // existed do not say which one it was, so the whole période stays bold.
    if (bool(d, "start_changed") && bool(d, "end_changed") === false)
      return { ...base, value: start, valueSuffix: ` → ${end}` };
    if (bool(d, "end_changed") && bool(d, "start_changed") === false)
      return { ...base, valuePrefix: `${start} → `, value: end };
    return { ...base, value: `${start} → ${end}` };
  },
  phase_renseignee: (d) => ({
    icon: "fr-icon-time-line",
    label: "Phase renseignée :",
    value: str(d, "value") ?? undefined,
  }),
  echeance_renseignee: (d) => {
    const value = day(str(d, "value"));
    return value
      ? {
          icon: "fr-icon-calendar-event-line",
          label: "Date de prochaine échéance renseignée :",
          value,
        }
      : { icon: "fr-icon-calendar-event-line", label: "Date de prochaine échéance retirée" };
  },
  prochaine_action_renseignee: (d) => ({
    icon: "fr-icon-bank-line",
    label: "Entité en charge de la prochaine action renseignée :",
    value: str(d, "value") ?? undefined,
  }),
  prochaine_action_attendue_renseignee: (d) => {
    const value = str(d, "value");
    return value
      ? { icon: "fr-icon-todo-line", label: "Prochaine action attendue renseignée :", value }
      : { icon: "fr-icon-todo-line", label: "Prochaine action attendue retirée" };
  },
  ddep_renseignee: (d) => ({
    icon: "fr-icon-seedling-line",
    label: "Nécessité d'une DDEP renseignée :",
    value: str(d, "value") ?? undefined,
  }),
  enjeu_renseigne: (d) => ({
    icon: "fr-icon-alarm-warning-line",
    label: "Dossier à enjeu renseigné :",
    value: str(d, "value") ?? undefined,
  }),
  onagre_renseigne: (d) => ({
    icon: "fr-icon-hashtag",
    label: "N° de dossier Onagre renseigné :",
    value: str(d, "value") ?? undefined,
  }),
  commentaire_ajoute: (d) => ({
    icon: "fr-icon-chat-2-line",
    label: "Commentaire ajouté :",
    value: str(d, "excerpt") ?? undefined,
  }),
  commentaire_modifie: (d) => ({
    icon: "fr-icon-chat-2-line",
    label: "Commentaire modifié :",
    value: str(d, "excerpt") ?? undefined,
  }),
  saisine_importee: () => ({ icon: "fr-icon-attachment-line", label: "Saisine importée" }),
  avis_importe: (d) => ({
    icon: "fr-icon-quote-line",
    label: "Avis d'expert importé" + (str(d, "avis") ? " :" : ""),
    value: str(d, "avis") ?? undefined,
  }),
  decision_importee: () => ({
    icon: "fr-icon-attachment-line",
    label: "Décision administrative importée",
  }),
  decision_modifiee: (d) => ({
    icon: "fr-icon-file-text-line",
    label: "Décision administrative modifiée" + (str(d, "decision_type") ? " :" : ""),
    value: str(d, "decision_type") ?? undefined,
  }),
  decision_supprimee: () => ({
    icon: "fr-icon-delete-line",
    label: "Décision administrative supprimée",
  }),
  avis_modifie: (d) => ({
    icon: "fr-icon-quote-line",
    label: "Avis d'expert modifié" + (str(d, "expert") ? " :" : ""),
    value: str(d, "expert") ?? undefined,
  }),
  avis_supprime: () => ({ icon: "fr-icon-delete-line", label: "Avis d'expert supprimé" }),
  prescription_ajoutee: (d) => ({
    icon: "fr-icon-list-unordered",
    label: "Prescription ajoutée" + (str(d, "article_number") ? " — article" : ""),
    value: str(d, "article_number") ?? undefined,
  }),
  prescription_modifiee: (d) => ({
    icon: "fr-icon-list-unordered",
    label: "Prescription modifiée" + (str(d, "article_number") ? " — article" : ""),
    value: str(d, "article_number") ?? undefined,
  }),
  prescription_supprimee: () => ({ icon: "fr-icon-delete-line", label: "Prescription supprimée" }),
  controle_ajoute: (d) => ({
    icon: "fr-icon-check-line",
    label: "Contrôle ajouté" + (str(d, "result") ? " :" : ""),
    value: str(d, "result") ?? undefined,
  }),
  controle_modifie: (d) => ({
    icon: "fr-icon-check-line",
    label: "Contrôle modifié" + (str(d, "result") ? " :" : ""),
    value: str(d, "result") ?? undefined,
  }),
  controle_supprime: () => ({ icon: "fr-icon-delete-line", label: "Contrôle supprimé" }),
  controle_retour_conformite: () => ({
    icon: "fr-icon-success-line",
    label: "Retour à la conformité d'une prescription",
  }),
  document_genere: (d) => ({
    icon: "fr-icon-file-download-line",
    label: "Document généré :",
    value: str(d, "name") ?? undefined,
  }),
};

/** An unknown type still shows up in the historique, under its raw name. */
export function actionDisplay(type: string, data: ActionData): ActionDisplay {
  return displayByType[type]?.(data) ?? { icon: "fr-icon-pencil-line", label: type };
}
