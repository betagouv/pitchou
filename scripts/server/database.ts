import knex, { type Knex } from "knex";

import type { default as Personne } from "../types/database/public/Personne.ts";
import type { default as Entreprise } from "../types/database/public/Entreprise.ts";
import type { default as RésultatSynchronisationDS88444 } from "../types/database/public/RésultatSynchronisationDS88444.ts";
import type {
  IdentitéInstructeurPitchou,
  PitchouInstructeurCapabilities,
} from "../types/capabilities.ts";
import type { StringValues } from "../types/tools.d.ts";

import { isAdminEmail } from "./admin.ts";

export const directDatabaseConnection = knex({
  client: "pg",
  connection: process.env.DATABASE_URL,
});

export function closeDatabaseConnection(): ReturnType<Knex["destroy"]> {
  return directDatabaseConnection.destroy();
}

export function créerTransaction(config?: Knex.TransactionConfig): Promise<Knex.Transaction> {
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

export async function getInstructeurCapBundleByPersonneCodeAccès(
  code_accès: NonNullable<Personne["code_accès"]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<
  Partial<StringValues<PitchouInstructeurCapabilities> & { identité: IdentitéInstructeurPitchou }>
> {
  const remplirAnnotationsP = databaseConnection("arête_personne__cap_écriture_annotation")
    .select("cap")
    .leftJoin("cap_écriture_annotation", {
      "cap_écriture_annotation.cap":
        "arête_personne__cap_écriture_annotation.écriture_annotation_cap",
    })
    .where({ personne_cap: code_accès })
    .first();

  const identitéP = databaseConnection("personne").select("email").where({ code_accès }).first();

  const listerDossiersP = databaseConnection("cap_dossier")
    .select("cap")
    .where({ personne_cap: code_accès })
    .first()
    .then((cap_dossier) => (cap_dossier ? cap_dossier.cap : undefined));

  const créerÉvènementMetriqueP = databaseConnection("cap_évènement_métrique")
    .select("cap")
    .where({ personne_cap: code_accès })
    .first()
    .then((cap_dossier) => (cap_dossier ? cap_dossier.cap : undefined));

  // Pour le moment, les droits associés à tout un tas de capabilities la même partie secrète
  // de la capability que pour lister les dossiers
  const recupérerDossierCompletP = listerDossiersP;
  const listerRelationSuiviP = listerDossiersP;
  const modifierRelationSuiviP = listerDossiersP;
  const listerÉvènementsPhaseDossierP = listerDossiersP;
  const listerMessagesP = listerDossiersP;
  const modifierDossierP = listerDossiersP;
  const modifierDécisionAdministrativeDansDossierP = listerDossiersP;
  const listerNotificationsP = listerDossiersP;
  const updateNotificationP = listerDossiersP;

  return Promise.all([
    remplirAnnotationsP,
    listerDossiersP,
    recupérerDossierCompletP,
    listerRelationSuiviP,
    modifierRelationSuiviP,
    listerÉvènementsPhaseDossierP,
    listerMessagesP,
    modifierDossierP,
    modifierDécisionAdministrativeDansDossierP,
    créerÉvènementMetriqueP,
    identitéP,
    listerNotificationsP,
    updateNotificationP,
  ]).then(
    ([
      remplirAnnotations,
      listerDossiers,
      recupérerDossierComplet,
      listerRelationSuivi,
      modifierRelationSuivi,
      listerÉvènementsPhaseDossier,
      listerMessages,
      modifierDossier,
      modifierDécisionAdministrativeDansDossier,
      créerÉvènementMetrique,
      identité,
      listerNotifications,
      updateNotificationForDossier,
    ]) => {
      const ret: Awaited<ReturnType<typeof getInstructeurCapBundleByPersonneCodeAccès>> = {
        remplirAnnotations: undefined,
        listerDossiers,
        recupérerDossierComplet,
        listerRelationSuivi,
        modifierRelationSuivi,
        listerÉvènementsPhaseDossier,
        listerMessages,
        modifierDossier,
        identité: identité
          ? { email: identité.email, estAdmin: isAdminEmail(identité.email) }
          : undefined,
        créerÉvènementMetrique,
        modifierDécisionAdministrativeDansDossier,
        listerNotifications,
        updateNotificationForDossier,
      };

      if (remplirAnnotations && remplirAnnotations.cap)
        ret.remplirAnnotations = remplirAnnotations.cap;

      return ret;
    },
  );
}

export async function getRelationSuivis(
  listeDossiersCap: NonNullable<Personne["code_accès"]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<ReturnType<PitchouInstructeurCapabilities["listerRelationSuivi"]>> {
  const relsBDD = await databaseConnection("dossier")
    .select(["dossier.id as dossier", "personne.email as email"])
    .join("arête_groupe_instructeurs__dossier", {
      "arête_groupe_instructeurs__dossier.dossier": "dossier.id",
    })
    .join("arête_cap_dossier__groupe_instructeurs", {
      "arête_cap_dossier__groupe_instructeurs.groupe_instructeurs":
        "arête_groupe_instructeurs__dossier.groupe_instructeurs",
    })
    .where({ "arête_cap_dossier__groupe_instructeurs.cap_dossier": listeDossiersCap })
    .leftJoin("arête_personne_suit_dossier", {
      "arête_personne_suit_dossier.dossier": "dossier.id",
    })
    .leftJoin("personne", {
      "personne.id": "arête_personne_suit_dossier.personne",
    })
    .whereNotNull("email");

  //console.log('relsBDD', relsBDD)

  const retMap = new Map();

  for (const { email, dossier } of relsBDD) {
    const dossiersSuivisIds = retMap.get(email) || new Set();
    dossiersSuivisIds.add(dossier);
    retMap.set(email, dossiersSuivisIds);
  }

  return [...retMap].map(([email, dossiersSuivisIds]) => ({
    personneEmail: email,
    dossiersSuivisIds: [...dossiersSuivisIds],
  }));
}

export async function getRésultatsSynchronisationDS88444(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<RésultatSynchronisationDS88444[]> {
  return databaseConnection("résultat_synchronisation_DS_88444").select("*");
}

export async function addRésultatSynchronisationDS88444(
  résultatSynchro: RésultatSynchronisationDS88444,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  return databaseConnection("résultat_synchronisation_DS_88444")
    .insert([résultatSynchro])
    .onConflict("succès")
    .merge();
}
