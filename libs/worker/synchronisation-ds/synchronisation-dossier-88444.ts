import {
  téléchargerNouveauxFichiersFromChampId,
  téléchargerNouveauxFichiersEspècesImpactées,
} from "./téléchargerNouveauxFichiersParType.ts";

import type { DossierDS88444 } from "@pitchou/types/démarche-numérique/apiSchema.ts";
import type { ChampDescriptor } from "@pitchou/types/démarche-numérique/schema.ts";
import type { default as Fichier } from "@pitchou/types/database/public/Fichier.ts";
import type { Knex } from "knex";
import type { ChampFormulaire88444 } from "@pitchou/types/API_Pitchou.ts";

/**
 * Télécharge les nouveaux fichiers "Espèces impactées" pour la démarche 88444
 */
export function récupérerFichiersEspècesImpactées88444(
  dossiersDS: DossierDS88444[],
  pitchouKeyToChampDS: Map<string, ChampDescriptor["id"]>,
  laTransactionDeSynchronisationDS: Knex.Transaction | Knex,
): Promise<Map<DossierDS88444["number"], Fichier["id"]> | undefined> {
  const fichierEspècesImpactéeChampId: ChampDescriptor["id"] | undefined = pitchouKeyToChampDS.get(
    "Déposez ici le fichier téléchargé après remplissage sur https://pitchou.beta.gouv.fr/saisie-especes",
  );
  if (!fichierEspècesImpactéeChampId) {
    throw new Error("fichierEspècesImpactéeChampId is undefined");
  }

  return téléchargerNouveauxFichiersEspècesImpactées(
    dossiersDS,
    fichierEspècesImpactéeChampId,
    laTransactionDeSynchronisationDS,
  );
}

/**
 * Télécharge les pièces jointes au dossier fournies par le pétitionnaire pour la démarche 88444
 */
export async function récupérerPiècesJointesPétitionnaire88444(
  dossiersDS: DossierDS88444[],
  pitchouKeyToChampDS: Map<ChampFormulaire88444, ChampDescriptor["id"]>,
  champsAvecPiècesJointes: ChampFormulaire88444[],
  databaseConnection: Knex.Transaction | Knex,
): Promise<Map<DossierDS88444["number"], Fichier["id"][]>> {
  const fichiersP: Map<DossierDS88444["number"], Fichier["id"][]> = new Map();

  for (const champ of champsAvecPiècesJointes) {
    const champId = pitchouKeyToChampDS.get(champ);
    if (!champId) {
      throw new Error(`champId for ${champ} is undefined`);
    }
    const fichiersFromDossierP = téléchargerNouveauxFichiersFromChampId(
      dossiersDS,
      champId,
      databaseConnection,
    );

    const fichiersFromDossier = await fichiersFromDossierP;

    if (fichiersFromDossier) {
      for (const [number, fichierIds] of fichiersFromDossier) {
        const fichiersIdsDéjàLà = fichiersP.get(number) || [];
        fichiersP.set(number, [...fichierIds, ...fichiersIdsDéjàLà]);
      }
    }
  }

  return fichiersP;
}
