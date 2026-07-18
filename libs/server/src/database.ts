import knex, { type Knex } from "knex";

import type { default as Personne } from "@pitchou/types/database/public/Personne.ts";
import type { default as Entreprise } from "@pitchou/types/database/public/Entreprise.ts";
import type { default as DemarcheNumerique88444SynchronizationResult } from "@pitchou/types/database/public/DemarcheNumerique88444SynchronizationResult.ts";
import type {
  IdentiteInstructeurPitchou,
  PitchouInstructeurCapabilities,
} from "@pitchou/types/capabilities.ts";
import type { StringValues } from "@pitchou/types/tools.d.ts";

import { isAdminEmail } from "./admin.ts";

export const directDatabaseConnection = knex({
  client: "pg",
  connection: process.env.DATABASE_URL,
});

export function closeDatabaseConnection(): ReturnType<Knex["destroy"]> {
  return directDatabaseConnection.destroy();
}

export function createTransaction(config?: Knex.TransactionConfig): Promise<Knex.Transaction> {
  return directDatabaseConnection.transaction(config);
}

export function listAllEntreprises(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Entreprise[]> {
  return databaseConnection("entreprise").select();
}

export function dumpEntreprises(
  entreprises: Entreprise[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  return databaseConnection("entreprise").insert(entreprises).onConflict("siret").merge();
}

export async function getInstructeurCapBundleByPersonneCodeAcces(
  accessCode: NonNullable<Personne["access_code"]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<
  Partial<StringValues<PitchouInstructeurCapabilities> & { identité: IdentiteInstructeurPitchou }>
> {
  const fillAnnotationsP = databaseConnection("edge_personne__cap_annotation_write")
    .select("cap")
    .leftJoin("cap_annotation_write", {
      "cap_annotation_write.cap": "edge_personne__cap_annotation_write.annotation_write_cap",
    })
    .where({ personne_cap: accessCode })
    .first();

  const identiteP = databaseConnection("personne")
    .select("email")
    .where({ access_code: accessCode })
    .first();

  const listDossiersP = databaseConnection("cap_dossier")
    .select("cap")
    .where({ personne_cap: accessCode })
    .first()
    .then((cap_dossier) => (cap_dossier ? cap_dossier.cap : undefined));

  const createEvenementMetriqueP = databaseConnection("cap_evenement_metrique")
    .select("cap")
    .where({ personne_cap: accessCode })
    .first()
    .then((cap_dossier) => (cap_dossier ? cap_dossier.cap : undefined));

  // For now, the rights associated with a whole bunch of capabilities share the same secret part
  // of the capability as for listing the dossiers
  const getDossierFullP = listDossiersP;
  const listRelationSuiviP = listDossiersP;
  const updateRelationSuiviP = listDossiersP;
  const listEvenementsPhaseDossierP = listDossiersP;
  const listMessagesP = listDossiersP;
  const updateDossierP = listDossiersP;
  const updateDecisionAdministrativeInDossierP = listDossiersP;
  const listNotificationsP = listDossiersP;
  const updateNotificationP = listDossiersP;

  return Promise.all([
    fillAnnotationsP,
    listDossiersP,
    getDossierFullP,
    listRelationSuiviP,
    updateRelationSuiviP,
    listEvenementsPhaseDossierP,
    listMessagesP,
    updateDossierP,
    updateDecisionAdministrativeInDossierP,
    createEvenementMetriqueP,
    identiteP,
    listNotificationsP,
    updateNotificationP,
  ]).then(
    ([
      fillAnnotations,
      listDossiers,
      getDossierFull,
      listRelationSuivi,
      updateRelationSuivi,
      listEvenementsPhaseDossier,
      listMessages,
      updateDossier,
      updateDecisionAdministrativeInDossier,
      createEvenementMetrique,
      identite,
      listNotifications,
      updateNotificationForDossier,
    ]) => {
      const ret: Awaited<ReturnType<typeof getInstructeurCapBundleByPersonneCodeAcces>> = {
        remplirAnnotations: undefined,
        listerDossiers: listDossiers,
        recupérerDossierComplet: getDossierFull,
        listFollowRelations: listRelationSuivi,
        updateFollowRelation: updateRelationSuivi,
        listerEvenementsPhaseDossier: listEvenementsPhaseDossier,
        listerMessages: listMessages,
        modifierDossier: updateDossier,
        identité: identite
          ? { email: identite.email, estAdmin: isAdminEmail(identite.email) }
          : undefined,
        creerEvenementMetrique: createEvenementMetrique,
        modifierDecisionAdministrativeDansDossier: updateDecisionAdministrativeInDossier,
        listerNotifications: listNotifications,
        updateNotificationForDossier,
      };

      if (fillAnnotations && fillAnnotations.cap) ret.remplirAnnotations = fillAnnotations.cap;

      return ret;
    },
  );
}

export async function getRelationSuivis(
  dossierListCap: NonNullable<Personne["access_code"]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<ReturnType<PitchouInstructeurCapabilities["listFollowRelations"]>> {
  const relsDB = await databaseConnection("dossier")
    .select(["dossier.id as dossier", "personne.email as email"])
    .join("edge_groupe_instructeurs__dossier", {
      "edge_groupe_instructeurs__dossier.dossier": "dossier.id",
    })
    .join("edge_cap_dossier__groupe_instructeurs", {
      "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs":
        "edge_groupe_instructeurs__dossier.groupe_instructeurs",
    })
    .where({ "edge_cap_dossier__groupe_instructeurs.cap_dossier": dossierListCap })
    .leftJoin("edge_personne_follows_dossier", {
      "edge_personne_follows_dossier.dossier": "dossier.id",
    })
    .leftJoin("personne", {
      "personne.id": "edge_personne_follows_dossier.personne",
    })
    .whereNotNull("email");

  //console.log('relsDB', relsDB)

  const retMap = new Map();

  for (const { email, dossier } of relsDB) {
    const followedDossierIds = retMap.get(email) || new Set();
    followedDossierIds.add(dossier);
    retMap.set(email, followedDossierIds);
  }

  return [...retMap].map(([email, followedDossierIds]) => ({
    personneEmail: email,
    followedDossierIds: [...followedDossierIds],
  }));
}

export async function getDemarcheNumerique88444SynchronizationResults(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DemarcheNumerique88444SynchronizationResult[]> {
  return databaseConnection("demarche_numerique_88444_synchronization_result").select("*");
}

export async function addDemarcheNumerique88444SynchronizationResult(
  synchronizationResult: DemarcheNumerique88444SynchronizationResult,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  return databaseConnection("demarche_numerique_88444_synchronization_result")
    .insert([synchronizationResult])
    .onConflict("success")
    .merge();
}
