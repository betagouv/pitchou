import type {
  default as AvisExpert,
  AvisExpertInitializer,
  AvisExpertMutator,
} from "../../types/database/public/AvisExpert.ts";
import type { Knex } from "knex";
import type { PickNonNullable } from "../../types/tools";
import type Fichier from "../../types/database/public/Fichier.ts";
import type { default as Dossier } from "../../types/database/public/Dossier.ts";

import { directDatabaseConnection } from "../database.js";
import { ajouterFichier } from "./fichier.ts";

function estUnAvisExpertÀModifier(
  avisExpert: AvisExpertInitializer | ({ id: string } & AvisExpertMutator),
): boolean {
  return avisExpert.id !== undefined;
}

export async function ajouterOuModifierAvisExpertAvecFichiers(
  avisExpert: AvisExpertInitializer | ({ id: string } & AvisExpertMutator),
  fichierSaisine?: PickNonNullable<Fichier, "nom" | "contenu" | "media_type">,
  fichierAvis?: PickNonNullable<Fichier, "nom" | "contenu" | "media_type">,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  try {
    const fichierSaisineAjoutéP = fichierSaisine
      ? ajouterFichier(fichierSaisine, databaseConnection)
      : Promise.resolve();
    const fichierAvisAjoutéP = fichierAvis
      ? ajouterFichier(fichierAvis, databaseConnection)
      : Promise.resolve();

    const [fichierSaisineAjouté, fichierAvisAjouté] = await Promise.all([
      fichierSaisineAjoutéP,
      fichierAvisAjoutéP,
    ]);

    if (estUnAvisExpertÀModifier(avisExpert)) {
      const avisExpertÀMaj = avisExpert as { id: string } & AvisExpertMutator;

      return modifierAvisExpert(
        {
          ...avisExpertÀMaj,
          id: avisExpertÀMaj.id,
          saisine_fichier: fichierSaisineAjouté?.id ?? undefined,
          avis_fichier: fichierAvisAjouté?.id ?? undefined,
        },
        databaseConnection,
      );
    } else {
      const avisExpertÀInsérer = avisExpert as AvisExpertInitializer;

      return ajouterAvisExpert(
        {
          ...avisExpertÀInsérer,
          saisine_fichier: fichierSaisineAjouté?.id ?? undefined,
          avis_fichier: fichierAvisAjouté?.id ?? undefined,
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
  if (estUnAvisExpertÀModifier(avisExpert)) {
    const avisExpertÀMaj = avisExpert as { id: string } & AvisExpertMutator;
    return modifierAvisExpert(avisExpertÀMaj, databaseConnection);
  } else {
    const avisExpertÀInsérer = avisExpert as AvisExpertInitializer;
    return ajouterAvisExpert(avisExpertÀInsérer, databaseConnection);
  }
}

export function ajouterAvisExpert(
  avisExpert: AvisExpertInitializer | AvisExpertInitializer[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  return databaseConnection("avis_expert").insert(avisExpert).returning(["id"]);
}

export function modifierAvisExpert(
  avisExpert: { id: string } & AvisExpertMutator,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  return databaseConnection("avis_expert")
    .update(avisExpert)
    .where({ id: avisExpert.id })
    .returning(["id"]);
}

export function supprimerAvisExpert(
  avisExpertId: AvisExpert["id"] | AvisExpert["id"][],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const idsÀSupprimer = Array.isArray(avisExpertId) ? avisExpertId : [avisExpertId];
  return databaseConnection("avis_expert").delete().whereIn("id", idsÀSupprimer);
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
