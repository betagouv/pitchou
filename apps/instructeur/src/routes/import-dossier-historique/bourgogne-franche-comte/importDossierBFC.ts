import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import { bfcActivite, bfcAutorisation, bfcDemandeur, bfcLocalisation } from "./bfcDossierFields.ts";
import { createBFCAdditionalData } from "./bfcAdditionalData.ts";
import type { DossierBFCRow } from "./DossierBFCRow.ts";

export type { DossierBFCRow } from "./DossierBFCRow.ts";
export { createBFCAdditionalData as createAdditionalDataFromRow } from "./bfcAdditionalData.ts";

export function createDossierName(row: DossierBFCRow): string {
  return `N° Dossier DEROG ${row["N° Dossier DEROG"]} - ${row.OBJET}`;
}

export async function createDossierFromRow(
  row: DossierBFCRow,
  activites: Set<DossierDemarcheNumerique88444["Activité principale"]>,
): Promise<Partial<DossierDemarcheNumerique88444>> {
  const localisation = await bfcLocalisation(row);
  const demandeur = bfcDemandeur(row);
  const autorisation = bfcAutorisation(row);
  return {
    "NE PAS MODIFIER - Données techniques associées à votre dossier": JSON.stringify(
      createBFCAdditionalData(row),
    ),
    "Nom du projet premettant de l'identifier clairement": createDossierName(row),
    "Dans quel département se localise majoritairement votre projet ?":
      localisation["Dans quel département se localise majoritairement votre projet ?"],
    "Avez-vous réalisé un état des lieux écologique complet ?": true,
    "Commune(s) où se situe le projet": localisation["Commune(s) où se situe le projet"],
    "Le projet se situe au niveau…": localisation["Le projet se situe au niveau…"],
    "Département(s) où se situe le projet": localisation["Département(s) où se situe le projet"],
    "Activité principale": bfcActivite(row.Thématique, activites),
    ...autorisation,
    ...demandeur,
  };
}
