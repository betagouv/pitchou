import type { Knex } from "knex";
import { isAdminEmail } from "../admin.ts";
import { directDatabaseConnection } from "./connection.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type {
  IdentiteInstructeurPitchou,
  PitchouInstructeurCapabilities,
} from "@pitchou/types/capabilities.ts";
import type { StringValues } from "@pitchou/types/tools.d.ts";

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
  const groupesP = databaseConnection("cap_dossier")
    .join(
      "edge_cap_dossier__groupe_instructeurs",
      "edge_cap_dossier__groupe_instructeurs.cap_dossier",
      "cap_dossier.cap",
    )
    .join(
      "groupe_instructeurs",
      "groupe_instructeurs.id",
      "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs",
    )
    .where("cap_dossier.personne_cap", accessCode)
    .distinct("groupe_instructeurs.name")
    .orderBy("groupe_instructeurs.name")
    .then((rows) => rows.map((row) => row.name));
  const listDossiersP = databaseConnection("cap_dossier")
    .select("cap")
    .where({ personne_cap: accessCode })
    .first()
    .then((cap) => cap?.cap);
  const createEvenementMetriqueP = databaseConnection("cap_evenement_metrique")
    .select("cap")
    .where({ personne_cap: accessCode })
    .first()
    .then((cap) => cap?.cap);
  const [fillAnnotations, listDossiers, createEvenementMetrique, identite, groupesInstructeurs] =
    await Promise.all([
      fillAnnotationsP,
      listDossiersP,
      createEvenementMetriqueP,
      identiteP,
      groupesP,
    ]);
  return {
    remplirAnnotations: fillAnnotations?.cap,
    listerDossiers: listDossiers,
    recupérerDossierComplet: listDossiers,
    listFollowRelations: listDossiers,
    updateFollowRelation: listDossiers,
    listDossierFollowerCandidates: listDossiers,
    updateDossierFollowers: listDossiers,
    listDossierPartageCandidates: listDossiers,
    updateDossierPartages: listDossiers,
    listerEvenementsPhaseDossier: listDossiers,
    listerActionsDossier: listDossiers,
    listerCommentaires: listDossiers,
    ajouterCommentaire: listDossiers,
    modifierCommentaire: listDossiers,
    modifierDossier: listDossiers,
    envoyerEmailCnpn: listDossiers,
    identité: identite
      ? { email: identite.email, estAdmin: isAdminEmail(identite.email), groupesInstructeurs }
      : undefined,
    creerEvenementMetrique: createEvenementMetrique,
    listRecentSearches: createEvenementMetrique,
    modifierDecisionAdministrativeDansDossier: listDossiers,
    listerNotifications: listDossiers,
    updateNotificationForDossier: listDossiers,
  };
}

export async function getRelationSuivis(
  dossierListCap: NonNullable<Personne["access_code"]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<ReturnType<PitchouInstructeurCapabilities["listFollowRelations"]>> {
  const rows = await databaseConnection("dossier")
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
    .leftJoin("personne", { "personne.id": "edge_personne_follows_dossier.personne" })
    .whereNotNull("email");
  const byEmail = new Map<string, Set<DossierId>>();
  for (const { email, dossier } of rows) {
    const dossierIds = byEmail.get(email) || new Set();
    dossierIds.add(dossier);
    byEmail.set(email, dossierIds);
  }
  return [...byEmail].map(([personneEmail, followedDossierIds]) => ({
    personneEmail,
    followedDossierIds: [...followedDossierIds],
  }));
}
