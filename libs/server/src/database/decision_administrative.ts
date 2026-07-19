import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import { storeNewFichier, deleteFichiersWithoutOtherReferences } from "./fichier.ts";

import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { default as Dossier } from "@pitchou/types/database/public/Dossier.ts";
import type { default as CapDossier } from "@pitchou/types/database/public/CapDossier.ts";
import type { default as DecisionAdministrative } from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type {
  DecisionAdministrativeForTransfer,
  FrontEndDecisionAdministrative,
} from "@pitchou/types/API_Pitchou.ts";

export async function addDecisionAdministrativeWithFichier(
  decision: DecisionAdministrativeForTransfer,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DecisionAdministrative["id"]> {
  const { id, number, type, signature_date, obligations_end_date, dossier } = decision;

  const decisionAdministrativeDB: Partial<DecisionAdministrative> = {
    id,
    number,
    type,
    signature_date,
    obligations_end_date,
    dossier,
  };

  if (decision.fichier_base64) {
    const { name, media_type, contenuBase64 } = decision.fichier_base64;
    const content = Buffer.from(contenuBase64, "base64");

    await storeNewFichier({ name, media_type, content }, databaseConnection).then((fichier) => {
      decisionAdministrativeDB.fichier = fichier.id;
    });
  }

  return databaseConnection("decision_administrative")
    .insert(decisionAdministrativeDB)
    .returning(["id"])
    .then((d) => d[0].id);
}

export function addDecisionsAdministratives(
  decisions: Omit<DecisionAdministrative, "id"> | Omit<DecisionAdministrative, "id">[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  if (!Array.isArray(decisions)) {
    decisions = [decisions];
  }

  return databaseConnection("decision_administrative").insert(decisions);
}

export function getDecisionAdministratives(
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DecisionAdministrative[]> {
  return databaseConnection("decision_administrative").select("*").where({ dossier: dossierId });
}

/**
 * Fetches the décisions administratives for each dossier
 */
export function getDecisionsAdministratives(
  cap_dossier: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<FrontEndDecisionAdministrative[]> {
  return databaseConnection("decision_administrative")
    .select("decision_administrative.*")
    .join("edge_groupe_instructeurs__dossier", {
      "edge_groupe_instructeurs__dossier.dossier": "decision_administrative.dossier",
    })
    .join("edge_cap_dossier__groupe_instructeurs", {
      "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs":
        "edge_groupe_instructeurs__dossier.groupe_instructeurs",
    })
    .where({ "edge_cap_dossier__groupe_instructeurs.cap_dossier": cap_dossier });
}

export async function updateDecisionAdministrative(
  decisionAdministrative: DecisionAdministrativeForTransfer,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  const { id, number, type, signature_date, obligations_end_date, dossier } =
    decisionAdministrative;

  if (!id) {
    throw new TypeError(
      `id manquant dans la décision administrative ${decisionAdministrative.number}, ${decisionAdministrative.signature_date}, ${decisionAdministrative.type}`,
    );
  }

  const decisionAdministrativeDB: Partial<DecisionAdministrative> = {
    id,
    number,
    type,
    signature_date,
    obligations_end_date,
    dossier,
  };

  let decisionAdministrativeReadyP: Promise<any> = Promise.resolve();

  let previousFichierIdP: Promise<FileId | undefined> = Promise.resolve(undefined);

  if (decisionAdministrative.fichier_base64) {
    const { name, media_type, contenuBase64 } = decisionAdministrative.fichier_base64;
    const content = Buffer.from(contenuBase64, "base64");

    decisionAdministrativeReadyP = storeNewFichier(
      { name, media_type, content },
      databaseConnection,
    ).then((fichier) => {
      decisionAdministrativeDB.fichier = fichier.id;
    });

    previousFichierIdP = databaseConnection("decision_administrative")
      .select(["fichier"])
      .where({ id })
      .then((decisions) => decisions[0].fichier);
  }

  await decisionAdministrativeReadyP;
  const updatedDecisionAdministrativeP = databaseConnection("decision_administrative")
    .update(decisionAdministrativeDB)
    .where({ id: decisionAdministrativeDB.id });

  return Promise.all([previousFichierIdP, updatedDecisionAdministrativeP]).then(
    ([previousFichierId]) => {
      if (previousFichierId) {
        return deleteFichiersWithoutOtherReferences([previousFichierId], databaseConnection);
      }
    },
  );
}

export async function deleteDecisionAdministrative(
  id: DecisionAdministrative["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  const rows = await databaseConnection("decision_administrative").select("fichier").where({ id });
  const fichierIds = rows.map((r) => r.fichier).filter((fichierId) => fichierId !== null);

  const result = await databaseConnection("decision_administrative").delete().where({ id });

  if (fichierIds.length >= 1) {
    await deleteFichiersWithoutOtherReferences(fichierIds, databaseConnection);
  }

  return result;
}

export async function getDossierIdFromDecisionAdministrative(
  id: DecisionAdministrative["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Dossier["id"] | undefined> {
  const rows = await databaseConnection("decision_administrative")
    .select(["dossier"])
    .where({ id });
  return rows[0]?.dossier;
}
