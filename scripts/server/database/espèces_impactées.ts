import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.js";
import { supprimerFichiersSansAutresRéférences } from "./fichier.js";

import type { default as Fichier } from "../../../scripts/types/database/public/Fichier.ts";
import type { DossierDS88444 } from "../../types/démarche-numérique/apiSchema.ts";

export async function synchroniserFichiersEspècesImpactéesDepuisDS88444(
  espècesImpactéesParNuméroDossier: Map<DossierDS88444["number"], Fichier["id"]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  // Trouver les fichiers déjà en place (pour les supprimer plus bas)
  const fichiersIdPrécédents = await databaseConnection("dossier")
    .select(["espèces_impactées"])
    .whereIn("number_demarches_simplifiées", [...espècesImpactéesParNuméroDossier.keys()])
    .andWhereNot({ espèces_impactées: null });

  // Associer les nouveaux fichiers espèces impactées au bon dossier
  const updatePs = [...espècesImpactéesParNuméroDossier].map(([numberDossier, fichierId]) => {
    return databaseConnection("dossier")
      .update({ espèces_impactées: fichierId })
      .where({ number_demarches_simplifiées: numberDossier });
  });

  // Supprimer les fichiers qui étaient attachés à un dossier et ne sont plus pertinents
  await Promise.all(updatePs);

  const fichiersAncienIds = fichiersIdPrécédents.map(({ espèces_impactées }) => espèces_impactées);
  await supprimerFichiersSansAutresRéférences(fichiersAncienIds, databaseConnection);
}
