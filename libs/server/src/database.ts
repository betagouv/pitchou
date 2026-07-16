import knex, { type Knex } from "knex";

import type { default as Personne } from "@pitchou/types/database/public/Personne.ts";
import type { default as Entreprise } from "@pitchou/types/database/public/Entreprise.ts";
import type { default as ResultatSynchronisationDS88444 } from "@pitchou/types/database/public/ResultatSynchronisationDS88444.ts";
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
  code_accès: NonNullable<Personne["code_accès"]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<
  Partial<StringValues<PitchouInstructeurCapabilities> & { identité: IdentiteInstructeurPitchou }>
> {
  const fillAnnotationsP = databaseConnection("arête_personne__cap_écriture_annotation")
    .select("cap")
    .leftJoin("cap_écriture_annotation", {
      "cap_écriture_annotation.cap":
        "arête_personne__cap_écriture_annotation.écriture_annotation_cap",
    })
    .where({ personne_cap: code_accès })
    .first();

  const identiteP = databaseConnection("personne").select("email").where({ code_accès }).first();

  const listDossiersP = databaseConnection("cap_dossier")
    .select("cap")
    .where({ personne_cap: code_accès })
    .first()
    .then((cap_dossier) => (cap_dossier ? cap_dossier.cap : undefined));

  const createEvenementMetriqueP = databaseConnection("cap_évènement_métrique")
    .select("cap")
    .where({ personne_cap: code_accès })
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
        listerRelationSuivi: listRelationSuivi,
        modifierRelationSuivi: updateRelationSuivi,
        listerÉvènementsPhaseDossier: listEvenementsPhaseDossier,
        listerMessages: listMessages,
        modifierDossier: updateDossier,
        identité: identite
          ? { email: identite.email, estAdmin: isAdminEmail(identite.email) }
          : undefined,
        créerÉvènementMetrique: createEvenementMetrique,
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
  dossierListCap: NonNullable<Personne["code_accès"]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<ReturnType<PitchouInstructeurCapabilities["listerRelationSuivi"]>> {
  const relsDB = await databaseConnection("dossier")
    .select(["dossier.id as dossier", "personne.email as email"])
    .join("arête_groupe_instructeurs__dossier", {
      "arête_groupe_instructeurs__dossier.dossier": "dossier.id",
    })
    .join("arête_cap_dossier__groupe_instructeurs", {
      "arête_cap_dossier__groupe_instructeurs.groupe_instructeurs":
        "arête_groupe_instructeurs__dossier.groupe_instructeurs",
    })
    .where({ "arête_cap_dossier__groupe_instructeurs.cap_dossier": dossierListCap })
    .leftJoin("arête_personne_suit_dossier", {
      "arête_personne_suit_dossier.dossier": "dossier.id",
    })
    .leftJoin("personne", {
      "personne.id": "arête_personne_suit_dossier.personne",
    })
    .whereNotNull("email");

  //console.log('relsDB', relsDB)

  const retMap = new Map();

  for (const { email, dossier } of relsDB) {
    const dossiersSuivisIds = retMap.get(email) || new Set();
    dossiersSuivisIds.add(dossier);
    retMap.set(email, dossiersSuivisIds);
  }

  return [...retMap].map(([email, dossiersSuivisIds]) => ({
    personneEmail: email,
    dossiersSuivisIds: [...dossiersSuivisIds],
  }));
}

export async function getResultatsSynchronisationDS88444(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<ResultatSynchronisationDS88444[]> {
  return databaseConnection("résultat_synchronisation_DS_88444").select("*");
}

export async function addResultatSynchronisationDS88444(
  resultatSynchro: ResultatSynchronisationDS88444,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  return databaseConnection("résultat_synchronisation_DS_88444")
    .insert([resultatSynchro])
    .onConflict("succès")
    .merge();
}
