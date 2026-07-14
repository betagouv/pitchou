import type {
  default as AvisExpert,
  AvisExpertInitializer,
  AvisExpertMutator,
} from "@pitchou/types/database/public/AvisExpert.ts";
import type { Knex } from "knex";
import type { default as Dossier } from "@pitchou/types/database/public/Dossier.ts";

import { directDatabaseConnection } from "../database.ts";
import { stockerNouveauFichier, supprimerFichiersSansAutresReferences } from "./fichier.ts";

function estUnAvisExpertAModifier(
  avisExpert: AvisExpertInitializer | ({ id: string } & AvisExpertMutator),
): boolean {
  return avisExpert.id !== undefined;
}

export async function ajouterOuModifierAvisExpertAvecFichiers(
  avisExpert: AvisExpertInitializer | ({ id: string } & AvisExpertMutator),
  fichierSaisine?: { nom: string; contenu: Buffer; media_type: string },
  fichierAvis?: { nom: string; contenu: Buffer; media_type: string },
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  try {
    const fichierSaisineAjouteP = fichierSaisine
      ? stockerNouveauFichier(fichierSaisine, databaseConnection)
      : Promise.resolve();
    const fichierAvisAjouteP = fichierAvis
      ? stockerNouveauFichier(fichierAvis, databaseConnection)
      : Promise.resolve();

    const [fichierSaisineAjoute, fichierAvisAjoute] = await Promise.all([
      fichierSaisineAjouteP,
      fichierAvisAjouteP,
    ]);

    if (estUnAvisExpertAModifier(avisExpert)) {
      const avisExpertAMaj = avisExpert as { id: string } & AvisExpertMutator;

      return modifierAvisExpert(
        {
          ...avisExpertAMaj,
          id: avisExpertAMaj.id,
          saisine_fichier: fichierSaisineAjoute?.id ?? undefined,
          avis_fichier: fichierAvisAjoute?.id ?? undefined,
        },
        databaseConnection,
      );
    } else {
      const avisExpertAInserer = avisExpert as AvisExpertInitializer;

      return ajouterAvisExpert(
        {
          ...avisExpertAInserer,
          saisine_fichier: fichierSaisineAjoute?.id ?? undefined,
          avis_fichier: fichierAvisAjoute?.id ?? undefined,
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

export function ajouterOuModifierAvisExpert(
  avisExpert: AvisExpertInitializer | ({ id: string } & AvisExpertMutator),
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  if (estUnAvisExpertAModifier(avisExpert)) {
    const avisExpertAMaj = avisExpert as { id: string } & AvisExpertMutator;
    return modifierAvisExpert(avisExpertAMaj, databaseConnection);
  } else {
    const avisExpertAInserer = avisExpert as AvisExpertInitializer;
    return ajouterAvisExpert(avisExpertAInserer, databaseConnection);
  }
}

export function ajouterAvisExpert(
  avisExpert: AvisExpertInitializer | AvisExpertInitializer[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  return databaseConnection("avis_expert").insert(avisExpert).returning(["id"]);
}

export async function modifierAvisExpert(
  avisExpert: { id: string } & AvisExpertMutator,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const checkSaisine = "saisine_fichier" in avisExpert;
  const checkAvis = "avis_fichier" in avisExpert;

  let ancien: Pick<AvisExpert, "saisine_fichier" | "avis_fichier"> | undefined;
  if (checkSaisine || checkAvis) {
    const rows = await databaseConnection("avis_expert")
      .select("saisine_fichier", "avis_fichier")
      .where({ id: avisExpert.id });
    ancien = rows[0];
  }

  const result = await databaseConnection("avis_expert")
    .update(avisExpert)
    .where({ id: avisExpert.id })
    .returning(["id"]);

  if (ancien) {
    const fichierIdsANettoyer = [];
    if (
      checkSaisine &&
      ancien.saisine_fichier !== null &&
      ancien.saisine_fichier !== avisExpert.saisine_fichier
    ) {
      fichierIdsANettoyer.push(ancien.saisine_fichier);
    }
    if (
      checkAvis &&
      ancien.avis_fichier !== null &&
      ancien.avis_fichier !== avisExpert.avis_fichier
    ) {
      fichierIdsANettoyer.push(ancien.avis_fichier);
    }
    if (fichierIdsANettoyer.length >= 1) {
      await supprimerFichiersSansAutresReferences(fichierIdsANettoyer, databaseConnection);
    }
  }

  return result;
}

export async function supprimerAvisExpert(
  avisExpertId: AvisExpert["id"] | AvisExpert["id"][],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const idsASupprimer = Array.isArray(avisExpertId) ? avisExpertId : [avisExpertId];

  const lignes = await databaseConnection("avis_expert")
    .select("saisine_fichier", "avis_fichier")
    .whereIn("id", idsASupprimer);
  const fichierIds = lignes
    .flatMap((r) => [r.saisine_fichier, r.avis_fichier])
    .filter((id) => id !== null);

  const result = await databaseConnection("avis_expert").delete().whereIn("id", idsASupprimer);

  if (fichierIds.length >= 1) {
    await supprimerFichiersSansAutresReferences(fichierIds, databaseConnection);
  }

  return result;
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
