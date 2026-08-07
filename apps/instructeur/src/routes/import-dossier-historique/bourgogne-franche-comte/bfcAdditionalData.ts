import { addMonths } from "date-fns";
import { isValidDateString } from "@pitchou/common/typeFormat.ts";
import { extractFirstMail } from "../importDossierUtils.ts";
import type { AdditionalDataForDossierCreation } from "../importDossierUtils.ts";
import type { PartialBy } from "@pitchou/types/tools.d.ts";
import type { EvenementPhaseDossierInitializer } from "@pitchou/types/database/public/EvenementPhaseDossier.ts";
import type { DecisionAdministrativeInitializer } from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type { AvisExpertInitializer } from "@pitchou/types/database/public/AvisExpert.ts";
import type { DossierBFCRow } from "./DossierBFCRow.ts";

function nextAction(row: DossierBFCRow): string {
  const value = row["Stade de l’avis"].trim();
  if (value === "En attente d’éléments pétitionnaire") return "Pétitionnaire";
  if (value === "En attente avis CSRPN/CNPN") return "CNPN/CSRPN";
  if (["En cours d’examen par DBIO", "En attente signature"].includes(value))
    return "Autre administration";
  if (value === "Clos") return "Personne";
  return "Instructeur";
}

function phaseEvents(
  row: DossierBFCRow,
): PartialBy<EvenementPhaseDossierInitializer, "dossier">[] | undefined {
  const today = new Date();
  const events: PartialBy<EvenementPhaseDossierInitializer, "dossier">[] = [];
  const step = row["Etapes du projet"].trim();
  const solicitationValid = isValidDateString(row["Date de sollicitation"].toString());
  const solicitation = solicitationValid ? new Date(row["Date de sollicitation"]) : today;
  if (["Phase amont", "Pôle EnR", "Contentieux"].includes(step))
    events.push({ phase: "Accompagnement amont", timestamp: solicitation });
  if (row.DEP.toLowerCase().trim() === "oui") {
    events.push({
      phase: "Instruction",
      timestamp: isValidDateString(row["Date de dépôt DEP"])
        ? new Date(row["Date de dépôt DEP"])
        : solicitation,
    });
  } else if (step === "Phase d’instruction") {
    events.push({
      phase: "Instruction",
      timestamp: isValidDateString(row["Date de dépôt DEP"])
        ? new Date(row["Date de dépôt DEP"])
        : solicitationValid
          ? addMonths(solicitation, 1)
          : today,
    });
  }
  if (isValidDateString(row["Date AP"]))
    events.push({ phase: "Contrôle", timestamp: new Date(row["Date AP"]) });
  else if (step === "Contrôle")
    events.push({
      phase: "Contrôle",
      timestamp: solicitationValid ? addMonths(solicitation, 3) : today,
    });
  return events.length ? events : undefined;
}

function decision(
  row: DossierBFCRow,
): PartialBy<DecisionAdministrativeInitializer, "dossier">[] | undefined {
  const value = row["Dérogation accordée"].trim().toLowerCase();
  const signature_date = isValidDateString(row["Date AP"])
    ? new Date(row["Date AP"])
    : addMonths(new Date(row["Date de sollicitation"]), 3);
  if (value === "non") return [{ signature_date, type: "Arrêté refus" }];
  if (["oui", "autorisé avec dep"].includes(value))
    return [{ signature_date, type: "Arrêté dérogation" }];
}

function avis(row: DossierBFCRow): PartialBy<AvisExpertInitializer, "dossier">[] | undefined {
  const expert = row["Saisine CSRPN/CNPN"];
  if (!expert?.trim()) return undefined;
  return [
    {
      expert,
      saisine_date: isValidDateString(row["Date saisine CSRPN/CNPN"])
        ? new Date(row["Date saisine CSRPN/CNPN"])
        : undefined,
      avis: row["Avis CSRPN/CNPN"] || undefined,
      avis_date: isValidDateString(row["Date avis CSRPN/CNPN"])
        ? new Date(row["Date avis CSRPN/CNPN"])
        : undefined,
    },
  ];
}

export function createBFCAdditionalData(row: DossierBFCRow): AdditionalDataForDossierCreation {
  const comments = [
    row["Description avancement dossier avec dates"]
      ? `Description avancement dossier avec dates : ${row["Description avancement dossier avec dates"]}`
      : "",
    row.OBSERVATIONS ? `Observations : ${row.OBSERVATIONS}` : "",
    row["Sollicitation OFB pour avis"].toLowerCase() === "oui"
      ? "Ce dossier nécessite une sollicitation OFB pour avis."
      : "",
  ]
    .filter((value) => value.trim())
    .join("\n");
  const email = extractFirstMail(row["POUR\nATTRIBUTION"]);
  return {
    dossier: {
      free_comment: comments,
      depot_date: isValidDateString(row["Date de sollicitation"].toString())
        ? row["Date de sollicitation"]
        : new Date(),
      onagre_demande_identifier: row["N° de l’avis Onagre ou interne"]?.trim() || undefined,
      next_action_expected_from: nextAction(row),
    },
    evenement_phase_dossier: phaseEvents(row),
    avis_expert: avis(row),
    decision_administrative: decision(row),
    followers: email ? [{ email }] : undefined,
  } as unknown as AdditionalDataForDossierCreation;
}
