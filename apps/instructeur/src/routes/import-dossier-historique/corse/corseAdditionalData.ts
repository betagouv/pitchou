import { isDate, setYear } from "date-fns";
import { isValidDateString } from "@pitchou/common/typeFormat.ts";
import type { AdditionalDataForDossierCreation, Alert } from "../importDossierUtils.ts";
import type { DossierCorseRow } from "./DossierCorseRow.ts";
import type { PartialBy } from "@pitchou/types/tools.d.ts";
import type { EvenementPhaseDossierInitializer } from "@pitchou/types/database/public/EvenementPhaseDossier.ts";
import type { AvisExpertInitializer } from "@pitchou/types/database/public/AvisExpert.ts";
import type { DecisionAdministrativeInitializer } from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type { PersonneWithRequiredEmail } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";

function avisExpert(
  row: DossierCorseRow,
): PartialBy<AvisExpertInitializer, "dossier">[] | undefined {
  const saisine = isDate(row["Date de dépôt sur ONAGRE"])
    ? new Date(row["Date de dépôt sur ONAGRE"])
    : undefined;
  if (row.Compétence !== "" || row["Avis rendu"] !== "")
    return [
      {
        expert: row.Compétence,
        avis: row["Avis rendu"],
        avis_date: new Date(row["Date avis"].toString()),
        saisine_date: saisine,
      },
    ];
  if (saisine) return [{ saisine_date: saisine }];
}

function decision(
  row: DossierCorseRow,
):
  | { data: PartialBy<DecisionAdministrativeInitializer, "dossier">[]; alertes: Alert[] }
  | undefined {
  const value = row["Date AP"];
  if (!value || (typeof value === "string" && value === "")) return undefined;
  if (isValidDateString(value.toString()))
    return {
      data: [{ signature_date: new Date(value), type: "Autre décision", number: row["Numéro AP"] }],
      alertes: [],
    };
  return {
    data: [],
    alertes: [
      {
        type: "erreur",
        message: `La date indiquée dans la colonne Date AP est incorrecte : ${value}. On n'importe donc pas de décision administrative.`,
      },
    ],
  };
}

function depotDate(row: DossierCorseRow) {
  const value = row["Date de début d'accompagnement"];
  if (value.toString().length === 4) return { data: new Date(value, 0, 1), alertes: [] };
  return {
    data: new Date(),
    alertes: [
      {
        type: "avertissement" as const,
        message: `L'année renseignée dans la colonne "Date de début d'accompagnement" est incorrecte et égale à "${value}". On ne peut donc pas renseigner la date de première sollicitation qui sera par défaut la date d'aujourd'hui.`,
      },
    ],
  };
}

function followers(
  row: DossierCorseRow,
  emails: Map<string, string>,
): PersonneWithRequiredEmail[] | undefined {
  const result: PersonneWithRequiredEmail[] = [];
  for (const initials of row["Instructeur DREAL"].replaceAll(" ", "").split("+")) {
    if (["BG", "MR", "MB"].includes(initials)) {
      const fallback = emails.get(row.Département === "2A" ? "CT" : "PZ");
      if (fallback) result.push({ email: fallback });
    }
    const email = emails.get(initials);
    if (email && !result.some((item) => item.email === email)) result.push({ email });
  }
  return result.length ? result : undefined;
}

function phaseEvents(row: DossierCorseRow) {
  const data: PartialBy<EvenementPhaseDossierInitializer, "dossier">[] = [];
  const alertes: Alert[] = [];
  const status = row.Statut.trim().toLowerCase();
  if (
    ["nouveau dossier à venir", "diagnostic préalable", "demande de compléments dossier"].includes(
      status,
    )
  )
    data.push({
      phase: "Accompagnement amont",
      timestamp: setYear(new Date(), row["Date de début d'accompagnement"]),
    });
  if (["rapport d'instruction", "dépôt onagre"].includes(status)) {
    const date = row["Date de réception du dossier autoportant"].toString();
    if (isValidDateString(date)) data.push({ phase: "Instruction", timestamp: new Date(date) });
    else
      alertes.push({
        type: "erreur",
        message: `La date donnée dans la colonne Date de réception du dossier complet est incorrecte : "${date}". On ne peut donc pas rajouter de phase "Instruction" pour ce dossier.`,
      });
  }
  return data.length ? { data, alertes } : undefined;
}

export function createCorseAdditionalData(
  row: DossierCorseRow,
  emails: Map<string, string>,
  siret?: string,
) {
  const phases = phaseEvents(row);
  const administrativeDecision = decision(row);
  const depot = depotDate(row);
  const freeComment = [
    ["Commentaire phase instruction", row["Commentaires phase instruction"]],
    ["Commentaires post AP", row["Commentaires post AP"]],
    ["Remarques", row.Remarques],
    ["Contribution", row.Contribution],
  ]
    .filter(([, content]) => content?.trim())
    .map(([title, content]) => `${title} : ${content}`)
    .join("\n");
  const start = isValidDateString(row["Début consultation"])
    ? new Date(row["Début consultation"])
    : undefined;
  const end = isValidDateString(row["Fin de publication"])
    ? new Date(row["Fin de publication"])
    : undefined;
  const next =
    row["Niveau d'avancement"].trim() === "A faire"
      ? "Instructeur"
      : row["Niveau d'avancement"].trim() === "En attente"
        ? "Autre"
        : undefined;
  return {
    data: {
      dossier: {
        onagre_demande_identifier: row["N°ONAGRE"],
        depot_date: depot.data,
        free_comment: freeComment,
        public_consultation_start_date: start,
        public_consultation_end_date: end,
        next_action_expected_from: next,
        demandeur_personne_morale: siret,
      },
      evenement_phase_dossier: phases?.data,
      avis_expert: avisExpert(row),
      decision_administrative: administrativeDecision?.data,
      followers: followers(row, emails),
    } as unknown as AdditionalDataForDossierCreation,
    alertes: [
      ...(phases?.alertes ?? []),
      ...(administrativeDecision?.alertes ?? []),
      ...depot.alertes,
    ],
  };
}
