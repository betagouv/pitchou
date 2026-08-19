import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
import type { DossierAction } from "@pitchou/types/capabilities.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

export type HistoriqueEntry = {
  id: string;
  icon: string;
  /** Drives the bubble colour: purple, yellow or grey. */
  tone: "instructeur" | "petitionnaire" | "system";
  label: string;
  /** Bold detail appended after the label. */
  value?: string;
  date: Date;
  /**
   * Whether the time of day is meaningful. Recorded actions carry a real
   * timestamp; milestones read from a date-only field (the consultation du
   * public) would otherwise all claim to have happened at midnight.
   */
  timeKnown: boolean;
  /** "par claire.morin", "par le pétitionnaire", "à la demande de…" */
  author?: string;
};

type Data = Record<string, unknown>;
const str = (data: Data, key: string): string | null =>
  typeof data[key] === "string" && data[key] ? (data[key] as string) : null;
const emailName = (email: string | null): string | null => email?.split("@")[0] ?? null;
const day = (value: string | null): string | null =>
  value ? formatDateAbsolute(new Date(value), "dd/MM/yyyy") : null;

const displayByType: Record<
  string,
  (data: Data) => Omit<HistoriqueEntry, "id" | "tone" | "date" | "timeKnown">
> = {
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
  dates_consultation_renseignees: (d) => ({
    icon: "fr-icon-calendar-line",
    label: "Dates de consultation du public renseignées :",
    value: `${day(str(d, "start")) ?? "?"} → ${day(str(d, "end")) ?? "?"}`,
  }),
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
};

function entryFromAction(action: DossierAction): HistoriqueEntry {
  const data = (action.data ?? {}) as Data;
  const display = displayByType[action.type]?.(data) ?? {
    icon: "fr-icon-pencil-line",
    label: action.type,
  };
  const requestedBy = emailName(str(data, "requested_by"));
  const authorName = emailName(action.author_email);
  return {
    id: action.id,
    tone: action.author_petitionnaire ? "petitionnaire" : authorName ? "instructeur" : "system",
    date: new Date(action.created_at),
    timeKnown: true,
    author: requestedBy
      ? `à la demande de ${requestedBy}`
      : action.author_petitionnaire
        ? "par le pétitionnaire"
        : authorName
          ? `par ${authorName}`
          : undefined,
    ...display,
  };
}

/** Dépôt label per provenance; unknown sources are legacy imports. */
const depotLabelBySource: Record<string, string> = {
  demarche_numerique: "Dossier déposé sur Démarches Numériques",
  pitchou: "Dossier créé dans Pitchou",
  gunenv: "Dossier importé depuis GunEnv",
  onagre: "Dossier importé depuis Onagre",
  import_fichier: "Dossier importé depuis un fichier du service",
  unknown: "Dossier importé dans Pitchou",
};

/** Milestones derived from the dossier itself rather than stored actions. */
function virtualEntries(dossier: DossierFull): HistoriqueEntry[] {
  const entries: HistoriqueEntry[] = [];
  if (dossier.depot_date) {
    const viaDN = dossier.source === "demarche_numerique";
    entries.push({
      id: "virtual-depot",
      icon: "fr-icon-file-text-line",
      tone: viaDN ? "petitionnaire" : "system",
      label: depotLabelBySource[dossier.source] ?? depotLabelBySource.unknown,
      date: new Date(dossier.depot_date),
      timeKnown: true,
      author: viaDN ? "par le pétitionnaire" : undefined,
    });
  }
  const now = new Date();
  const milestones: [Date | null, string, string][] = [
    [
      dossier.public_consultation_start_date,
      "virtual-consultation-start",
      "Début de la consultation du public",
    ],
    [
      dossier.public_consultation_end_date,
      "virtual-consultation-end",
      "Fin de la consultation du public",
    ],
  ];
  for (const [date, id, label] of milestones) {
    if (date && new Date(date) <= now) {
      entries.push({
        id,
        icon: "fr-icon-volume-up-line",
        tone: "system",
        label,
        date: new Date(date),
        // Entered as a day in the instruction form: it has no time of day.
        timeKnown: false,
      });
    }
  }
  return entries;
}

/** Full historique, stored actions and derived milestones, most recent first. */
export function historiqueEntries(
  actions: DossierAction[],
  dossier: DossierFull,
): HistoriqueEntry[] {
  return [...actions.map(entryFromAction), ...virtualEntries(dossier)].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );
}
