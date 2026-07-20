import type {
  default as AvisExpert,
  AvisExpertInitializer,
  AvisExpertMutator,
} from "@pitchou/types/database/public/AvisExpert.ts";
import type { Knex } from "knex";
import type { default as Dossier } from "@pitchou/types/database/public/Dossier.ts";
import type { default as CapDossier } from "@pitchou/types/database/public/CapDossier.ts";

import { directDatabaseConnection } from "../database.ts";
import { storeNewFichier, deleteFichiersWithoutOtherReferences } from "./fichier.ts";

function isAvisExpertToUpdate(
  avisExpert: AvisExpertInitializer | ({ id: string } & AvisExpertMutator),
): boolean {
  return avisExpert.id !== undefined;
}

export async function addOrUpdateAvisExpertWithFichiers(
  avisExpert: AvisExpertInitializer | ({ id: string } & AvisExpertMutator),
  fichierSaisine?: { name: string; content: Buffer; media_type: string },
  fichierAvis?: { name: string; content: Buffer; media_type: string },
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  try {
    const fichierSaisineAddedP = fichierSaisine
      ? storeNewFichier(fichierSaisine, databaseConnection)
      : Promise.resolve();
    const fichierAvisAddedP = fichierAvis
      ? storeNewFichier(fichierAvis, databaseConnection)
      : Promise.resolve();

    const [fichierSaisineAdded, fichierAvisAdded] = await Promise.all([
      fichierSaisineAddedP,
      fichierAvisAddedP,
    ]);

    if (isAvisExpertToUpdate(avisExpert)) {
      const avisExpertToUpdate = avisExpert as { id: string } & AvisExpertMutator;

      return updateAvisExpert(
        {
          ...avisExpertToUpdate,
          id: avisExpertToUpdate.id,
          saisine_fichier: fichierSaisineAdded?.id ?? undefined,
          avis_fichier: fichierAvisAdded?.id ?? undefined,
        },
        databaseConnection,
      );
    } else {
      const avisExpertToInsert = avisExpert as AvisExpertInitializer;

      return addAvisExpert(
        {
          ...avisExpertToInsert,
          saisine_fichier: fichierSaisineAdded?.id ?? undefined,
          avis_fichier: fichierAvisAdded?.id ?? undefined,
        },
        databaseConnection,
      );
    }
  } catch (e) {
    throw new Error(
      `Une erreur est survenue lors de l'ajout ou de la modification de l'avis d'expert avec les fichiers de saisine et d'avis : ${e}.`,
    );
  }
}

export function addOrUpdateAvisExpert(
  avisExpert: AvisExpertInitializer | ({ id: string } & AvisExpertMutator),
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  if (isAvisExpertToUpdate(avisExpert)) {
    const avisExpertToUpdate = avisExpert as { id: string } & AvisExpertMutator;
    return updateAvisExpert(avisExpertToUpdate, databaseConnection);
  } else {
    const avisExpertToInsert = avisExpert as AvisExpertInitializer;
    return addAvisExpert(avisExpertToInsert, databaseConnection);
  }
}

export function addAvisExpert(
  avisExpert: AvisExpertInitializer | AvisExpertInitializer[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  return databaseConnection("avis_expert").insert(avisExpert).returning(["id"]);
}

export async function updateAvisExpert(
  avisExpert: { id: string } & AvisExpertMutator,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const checkSaisine = "saisine_fichier" in avisExpert;
  const checkAvis = "avis_fichier" in avisExpert;

  let old: Pick<AvisExpert, "saisine_fichier" | "avis_fichier"> | undefined;
  if (checkSaisine || checkAvis) {
    const rows = await databaseConnection("avis_expert")
      .select("saisine_fichier", "avis_fichier")
      .where({ id: avisExpert.id });
    old = rows[0];
  }

  const result = await databaseConnection("avis_expert")
    .update(avisExpert)
    .where({ id: avisExpert.id })
    .returning(["id"]);

  if (old) {
    const fichierIdsToCleanUp = [];
    if (
      checkSaisine &&
      old.saisine_fichier !== null &&
      old.saisine_fichier !== avisExpert.saisine_fichier
    ) {
      fichierIdsToCleanUp.push(old.saisine_fichier);
    }
    if (checkAvis && old.avis_fichier !== null && old.avis_fichier !== avisExpert.avis_fichier) {
      fichierIdsToCleanUp.push(old.avis_fichier);
    }
    if (fichierIdsToCleanUp.length >= 1) {
      await deleteFichiersWithoutOtherReferences(fichierIdsToCleanUp, databaseConnection);
    }
  }

  return result;
}

export async function deleteAvisExpert(
  avisExpertId: AvisExpert["id"] | AvisExpert["id"][],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const idsToDelete = Array.isArray(avisExpertId) ? avisExpertId : [avisExpertId];

  const rows = await databaseConnection("avis_expert")
    .select("saisine_fichier", "avis_fichier")
    .whereIn("id", idsToDelete);
  const fichierIds = rows
    .flatMap((r) => [r.saisine_fichier, r.avis_fichier])
    .filter((id) => id !== null);

  const result = await databaseConnection("avis_expert").delete().whereIn("id", idsToDelete);

  if (fichierIds.length >= 1) {
    await deleteFichiersWithoutOtherReferences(fichierIds, databaseConnection);
  }

  return result;
}

/**
 * For every avis expert of the dossiers accessible through `cap_dossier`,
 * returns which dossier it belongs to and whether its saisine and avis files
 * are present. Used to filter dossiers missing a saisine or avis file.
 */
export function getPresenceFichiersAvisExpertByCap(
  capDossier: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<
  { dossier: Dossier["id"]; saisineFichierPresent: boolean; avisFichierPresent: boolean }[]
> {
  return databaseConnection("avis_expert")
    .select("avis_expert.dossier as dossier")
    .select(
      databaseConnection.raw('avis_expert.saisine_fichier is not null as "saisineFichierPresent"'),
    )
    .select(databaseConnection.raw('avis_expert.avis_fichier is not null as "avisFichierPresent"'))
    .join("edge_groupe_instructeurs__dossier", {
      "edge_groupe_instructeurs__dossier.dossier": "avis_expert.dossier",
    })
    .join("edge_cap_dossier__groupe_instructeurs", {
      "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs":
        "edge_groupe_instructeurs__dossier.groupe_instructeurs",
    })
    .where({ "edge_cap_dossier__groupe_instructeurs.cap_dossier": capDossier });
}

export function getFichiersAvisSaisineAvisExpert(
  avisExpertId: AvisExpert["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Pick<AvisExpert, "saisine_fichier" | "avis_fichier">[]> {
  return databaseConnection("avis_expert")
    .where({ id: avisExpertId })
    .select("saisine_fichier", "avis_fichier");
}

export async function getDossierIdFromAvisExpert(
  id: AvisExpert["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Dossier["id"] | undefined> {
  const rows = await databaseConnection("avis_expert").select(["dossier"]).where({ id });
  return rows[0]?.dossier;
}
