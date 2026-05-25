import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.js";

import { ajouterFichier, supprimerFichier } from "./fichier.ts";

import type { default as Fichier } from "../../../scripts/types/database/public/Fichier.ts";
import type { default as Dossier } from "../../../scripts/types/database/public/Dossier.ts";
import type { default as CapDossier } from "../../../scripts/types/database/public/CapDossier.ts";
import type { default as DécisionAdministrative } from "../../../scripts/types/database/public/DécisionAdministrative.ts";
import type {
  DécisionAdministrativePourTransfer,
  FrontEndDécisionAdministrative,
} from "../../../scripts/types/API_Pitchou.ts";

export async function ajouterDécisionAdministrativeAvecFichier(
  décision: DécisionAdministrativePourTransfer,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Fichier["id"]> {
  const { id, numéro, type, date_signature, date_fin_obligations, dossier } = décision;

  const décisionAdministrativeBDD: Partial<DécisionAdministrative> = {
    id,
    numéro,
    type,
    date_signature,
    date_fin_obligations,
    dossier,
  };

  if (décision.fichier_base64) {
    const { nom, media_type, contenuBase64 } = décision.fichier_base64;

    const contenu = Buffer.from(contenuBase64, "base64");

    const fichierBDD: Partial<Fichier> = {
      nom,
      media_type,
      contenu,
    };

    await ajouterFichier(fichierBDD, databaseConnection).then((fichier) => {
      décisionAdministrativeBDD.fichier = fichier.id;
    });
  }

  return databaseConnection("décision_administrative")
    .insert(décisionAdministrativeBDD)
    .returning(["id"])
    .then((d) => d[0].id);
}

export function ajouterDécisionsAdministratives(
  décisions: Omit<DécisionAdministrative, "id"> | Omit<DécisionAdministrative, "id">[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Map<Dossier["id"], Fichier["id"][]>> {
  if (!Array.isArray(décisions)) {
    décisions = [décisions];
  }

  return databaseConnection("décision_administrative").insert(décisions);
}

export function getDécisionAdministratives(
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DécisionAdministrative[]> {
  return databaseConnection("décision_administrative").select("*").where({ dossier: dossierId });
}

/**
 * Récupère les décisions administratives pour chaque dossier
 */
export function getDécisionsAdministratives(
  cap_dossier: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<FrontEndDécisionAdministrative[]> {
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

export async function modifierDécisionAdministrative(
  décisionAdministrative: DécisionAdministrativePourTransfer,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  const { id, numéro, type, date_signature, date_fin_obligations, dossier } =
    décisionAdministrative;

  if (!id) {
    throw new TypeError(
      `id manquant dans la décision administrative ${décisionAdministrative.numéro}, ${décisionAdministrative.date_signature}, ${décisionAdministrative.type}`,
    );
  }

  const décisionAdministrativeBDD: Partial<DécisionAdministrative> = {
    id,
    numéro,
    type,
    date_signature,
    date_fin_obligations,
    dossier,
  };

  let décisionAdministrativePrêteP: Promise<any> = Promise.resolve();

  let fichierIdPrécédentP: Promise<Fichier["id"] | undefined> = Promise.resolve(undefined);

  if (décisionAdministrative.fichier_base64) {
    const { nom, media_type, contenuBase64 } = décisionAdministrative.fichier_base64;

    const contenu = Buffer.from(contenuBase64, "base64");

    const fichierBDD: Partial<Fichier> = {
      nom,
      media_type,
      contenu,
    };

    décisionAdministrativePrêteP = ajouterFichier(fichierBDD, databaseConnection).then(
      (fichier) => {
        décisionAdministrativeBDD.fichier = fichier.id;
      },
    );

    fichierIdPrécédentP = databaseConnection("décision_administrative")
      .select(["fichier"])
      .where({ id })
      .then((décisions) => décisions[0].fichier);
  }

  await décisionAdministrativePrêteP;
  const décisionAdministrativeÀJourP = databaseConnection("décision_administrative")
    .update(décisionAdministrativeBDD)
    .where({ id: décisionAdministrativeBDD.id });

  return Promise.all([fichierIdPrécédentP, décisionAdministrativeÀJourP]).then(
    ([fichierIdPrécédent]) => {
      if (fichierIdPrécédent) {
        return supprimerFichier(fichierIdPrécédent, databaseConnection);
      }
    },
  );
}

export function supprimerDécisionAdministrative(
  id: DécisionAdministrative["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  return databaseConnection("décision_administrative").delete().where({ id });
}

export async function getDossierIdFromDecisionAdministrative(
  id: DécisionAdministrative["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Dossier["id"] | undefined> {
  const rows = await databaseConnection("décision_administrative")
    .select(["dossier"])
    .where({ id });
  return rows[0]?.dossier;
}
