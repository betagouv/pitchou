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
  /** "par claire.morin", "par le pétitionnaire", "à la demande de…" */
  author?: string;
};

type Data = Record<string, unknown>;
const str = (data: Data, key: string): string | null =>
  typeof data[key] === "string" && data[key] ? (data[key] as string) : null;
const emailName = (email: string | null): string | null => email?.split("@")[0] ?? null;
const day = (value: string | null): string | null =>
  value ? formatDateAbsolute(new Date(value), "dd/MM/yyyy") : null;

const displayByType: Record<string, (data: Data) => Omit<HistoriqueEntry, "id" | "tone" | "date">> =
  {
    champ_modifie: (d) => ({
      icon: "fr-icon-pencil-line",
      label: `Champ ${str(d, "field") ?? "du formulaire"} renseigné`,
    }),
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

/** Milestones derived from the dossier itself rather than stored actions. */
function virtualEntries(dossier: DossierFull): HistoriqueEntry[] {
  const entries: HistoriqueEntry[] = [];
  if (dossier.depot_date) {
    const viaDN = dossier.source === "demarche_numerique";
    entries.push({
      id: "virtual-depot",
      icon: "fr-icon-file-text-line",
      tone: viaDN ? "petitionnaire" : "system",
      label: viaDN ? "Dossier déposé sur Démarches Numériques" : "Dossier créé dans Pitchou",
      date: new Date(dossier.depot_date),
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
