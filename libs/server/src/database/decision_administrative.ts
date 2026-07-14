import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import { stockerNouveauFichier, supprimerFichiersSansAutresReferences } from "./fichier.ts";

import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { default as Dossier } from "@pitchou/types/database/public/Dossier.ts";
import type { default as CapDossier } from "@pitchou/types/database/public/CapDossier.ts";
import type { default as DecisionAdministrative } from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type {
  DecisionAdministrativePourTransfer,
  FrontEndDecisionAdministrative,
} from "@pitchou/types/API_Pitchou.ts";

export async function ajouterDecisionAdministrativeAvecFichier(
  decision: DecisionAdministrativePourTransfer,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DecisionAdministrative["id"]> {
  const { id, numéro, type, date_signature, date_fin_obligations, dossier } = decision;

  const decisionAdministrativeBDD: Partial<DecisionAdministrative> = {
    id,
    numéro,
    type,
    date_signature,
    date_fin_obligations,
    dossier,
  };

  if (decision.fichier_base64) {
    const { nom, media_type, contenuBase64 } = decision.fichier_base64;
    const contenu = Buffer.from(contenuBase64, "base64");

    await stockerNouveauFichier({ nom, media_type, contenu }, databaseConnection).then(
      (fichier) => {
        decisionAdministrativeBDD.fichier = fichier.id;
      },
    );
  }

  return databaseConnection("décision_administrative")
    .insert(decisionAdministrativeBDD)
    .returning(["id"])
    .then((d) => d[0].id);
}

export function ajouterDecisionsAdministratives(
  decisions: Omit<DecisionAdministrative, "id"> | Omit<DecisionAdministrative, "id">[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  if (!Array.isArray(decisions)) {
    decisions = [decisions];
  }

  return databaseConnection("décision_administrative").insert(decisions);
}

export function getDecisionAdministratives(
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DecisionAdministrative[]> {
  return databaseConnection("décision_administrative").select("*").where({ dossier: dossierId });
}

/**
 * Fetches the décisions administratives for each dossier
 */
export function getDecisionsAdministratives(
  cap_dossier: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<FrontEndDecisionAdministrative[]> {
  return databaseConnection("décision_administrative")
    .select("décision_administrative.*")
    .join("arête_groupe_instructeurs__dossier", {
      "arête_groupe_instructeurs__dossier.dossier": "décision_administrative.dossier",
    })
    .join("arête_cap_dossier__groupe_instructeurs", {
      "arête_cap_dossier__groupe_instructeurs.groupe_instructeurs":
        "arête_groupe_instructeurs__dossier.groupe_instructeurs",
    })
    .where({ "arête_cap_dossier__groupe_instructeurs.cap_dossier": cap_dossier });
}

export async function modifierDecisionAdministrative(
  decisionAdministrative: DecisionAdministrativePourTransfer,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  const { id, numéro, type, date_signature, date_fin_obligations, dossier } =
    decisionAdministrative;

  if (!id) {
    throw new TypeError(
      `id manquant dans la décision administrative ${decisionAdministrative.numéro}, ${decisionAdministrative.date_signature}, ${decisionAdministrative.type}`,
    );
  }

  const decisionAdministrativeBDD: Partial<DecisionAdministrative> = {
    id,
    numéro,
    type,
    date_signature,
    date_fin_obligations,
    dossier,
  };

  let decisionAdministrativePreteP: Promise<any> = Promise.resolve();

  let fichierIdPrecedentP: Promise<FileId | undefined> = Promise.resolve(undefined);

  if (decisionAdministrative.fichier_base64) {
    const { nom, media_type, contenuBase64 } = decisionAdministrative.fichier_base64;
    const contenu = Buffer.from(contenuBase64, "base64");

    decisionAdministrativePreteP = stockerNouveauFichier(
      { nom, media_type, contenu },
      databaseConnection,
    ).then((fichier) => {
      decisionAdministrativeBDD.fichier = fichier.id;
    });

    fichierIdPrecedentP = databaseConnection("décision_administrative")
      .select(["fichier"])
      .where({ id })
      .then((decisions) => decisions[0].fichier);
  }

  await decisionAdministrativePreteP;
  const decisionAdministrativeAJourP = databaseConnection("décision_administrative")
    .update(decisionAdministrativeBDD)
    .where({ id: decisionAdministrativeBDD.id });

  return Promise.all([fichierIdPrecedentP, decisionAdministrativeAJourP]).then(
    ([fichierIdPrecedent]) => {
      if (fichierIdPrecedent) {
        return supprimerFichiersSansAutresReferences([fichierIdPrecedent], databaseConnection);
      }
    },
  );
}

export async function supprimerDecisionAdministrative(
  id: DecisionAdministrative["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  const lignes = await databaseConnection("décision_administrative")
    .select("fichier")
    .where({ id });
  const fichierIds = lignes.map((r) => r.fichier).filter((fichierId) => fichierId !== null);

  const result = await databaseConnection("décision_administrative").delete().where({ id });

  if (fichierIds.length >= 1) {
    await supprimerFichiersSansAutresReferences(fichierIds, databaseConnection);
  }

  return result;
}

export async function getDossierIdFromDecisionAdministrative(
  id: DecisionAdministrative["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Dossier["id"] | undefined> {
  const rows = await databaseConnection("décision_administrative")
    .select(["dossier"])
    .where({ id });
  return rows[0]?.dossier;
}
