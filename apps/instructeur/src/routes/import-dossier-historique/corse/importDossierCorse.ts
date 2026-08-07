import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { DossierWithAlerts } from "../importDossierUtils.ts";
import type { DossierCorseRow } from "./DossierCorseRow.ts";
import {
  corseActivite,
  corseAutorisation,
  corseDemandeur,
  corseLocalisation,
} from "./corseDossierFields.ts";
import { createCorseAdditionalData } from "./corseAdditionalData.ts";

export type { DossierCorseRow } from "./DossierCorseRow.ts";

export function createDossierName(row: DossierCorseRow): string {
  return row["Libellé Projet"];
}

export async function createDossierFromRow(
  row: DossierCorseRow,
  emails: Map<string, string>,
  availableActivities: Set<DossierDemarcheNumerique88444["Activité principale"]>,
): Promise<DossierWithAlerts> {
  const localisation = await corseLocalisation(row);
  const activite = corseActivite(row, availableActivities);
  const demandeur = corseDemandeur(row);
  const additional = createCorseAdditionalData(row, emails, demandeur.siret);
  const demandeurFields = demandeur.siret
    ? {
        "Le demandeur est…": "une personne morale" as const,
        "Nom du représentant": row["Nom du demandeur"],
        "Numéro de SIRET": demandeur.siret,
      }
    : {};
  return {
    "Avez-vous réalisé un état des lieux écologique complet ?": true,
    "Des spécimens ou habitats d'espèces protégées sont-ils présents dans l'aire d'influence de votre projet ?": true,
    ...demandeurFields,
    "Nom du projet premettant de l'identifier clairement": createDossierName(row),
    "Activité principale": activite.data,
    "Transport ferroviaire ou électrique - Votre demande concerne :":
      activite.data === "Transport énergie électrique" ? "Autre" : undefined,
    ...localisation.data,
    ...corseAutorisation(row),
    "NE PAS MODIFIER - Données techniques associées à votre dossier": JSON.stringify(
      additional.data,
    ),
    alertes: [
      ...localisation.alertes,
      ...activite.alertes,
      ...demandeur.alertes,
      ...additional.alertes,
    ],
  } as DossierWithAlerts;
}

export function isDossierRowInDatabase(
  row: DossierCorseRow,
  names: Set<string | null>,
  onagreByName: Map<string | null, string | null>,
): boolean {
  const name = createDossierName(row);
  if (!name) {
    console.warn(
      `Attention, il n'y a pas de libellé pour le projet de la ligne ${JSON.stringify(row)}`,
    );
    return false;
  }
  return names.has(name) && onagreByName.get(name) === row["N°ONAGRE"];
}
