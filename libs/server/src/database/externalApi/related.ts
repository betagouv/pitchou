import type { Knex } from "knex";
import { isOfficialAvisExpert } from "@pitchou/common/avisExpert.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import { getDossierActions } from "../action_dossier.ts";
import { getDossierCommentaires } from "../commentaire.ts";
import { getControles } from "../controle.ts";
import { getDossierCnpnEmailSentEvents } from "../dossier_cnpn_email.ts";
import { getAvisExpertDossier, getDecisionsDossier } from "../dossier/fullQueries.ts";
import { getEvenementsPhaseDossier } from "../dossier/access.ts";
import { isFichierSharedInReadOnly } from "../dossier/readOnly.ts";
import { listDossierFichiers } from "../fichier_access.ts";
import { getImpactOnEspeces } from "../impact_espece/read.ts";
import { getPrescriptions } from "../prescription.ts";
import { formatStatus } from "./dossiers.ts";

function downloadUrl(dossier: DossierId, file: FileId) {
  return `/api/v1/dossiers/${dossier}/pieces-jointes/${file}`;
}

async function readAvis(id: DossierId, internal: boolean, trx: Knex.Transaction) {
  const rows = await getAvisExpertDossier(id, trx);
  return rows
    .filter(({ expert }) => internal || isOfficialAvisExpert(expert))
    .map((avis) => ({
      id: avis.id,
      expert: avis.expert,
      avis: avis.avis,
      avis_date: avis.avis_date,
      avis_file_url: avis.avis_fichier ? downloadUrl(id, avis.avis_fichier) : null,
      ...(internal && {
        saisine_date: avis.saisine_date,
        saisine_file_url: avis.saisine_fichier ? downloadUrl(id, avis.saisine_fichier) : null,
      }),
    }));
}

async function readDecisions(id: DossierId, trx: Knex.Transaction) {
  return (await getDecisionsDossier(id, trx)).map((decision) => ({
    id: decision.id,
    number: decision.number,
    type: decision.type,
    signature_date: decision.signature_date,
    obligations_end_date: decision.obligations_end_date,
    file_url: decision.fichier ? downloadUrl(id, decision.fichier) : null,
  }));
}

async function readPrescriptions(dossier: DossierId, trx: Knex.Transaction) {
  const decisions = await trx("decision_administrative").where({ dossier }).pluck("id");
  return getPrescriptions(decisions, trx);
}

async function readPiecesJointes(id: DossierId, internal: boolean, trx: Knex.Transaction) {
  return (await listDossierFichiers(id, trx))
    .filter((attachment) => internal || isFichierSharedInReadOnly(attachment))
    .map(({ dossier, size, type_piece: pieceType, date_piece: pieceDate, relation, ...file }) => ({
      ...file,
      size: Number(size),
      piece_type: pieceType,
      piece_date: pieceDate,
      relation: relation === "attachment-autre" ? "other-attachment" : relation,
      url: downloadUrl(dossier, file.id),
    }));
}

export const sharedDossierResources = {
  "avis-experts": readAvis,
  decisions: (id: DossierId, _internal: boolean, trx: Knex.Transaction) => readDecisions(id, trx),
  "pieces-jointes": readPiecesJointes,
  "especes-impactees": (id: DossierId, _internal: boolean, trx: Knex.Transaction) =>
    readEspeceImpacts(id, trx),
  "phase-events": async (id: DossierId, internal: boolean, trx: Knex.Transaction) =>
    (await getEvenementsPhaseDossier(id, trx)).map(
      ({ phase, timestamp, demarche_numerique_motivation: demarcheNumeriqueReason }) => ({
        ...formatStatus(phase, timestamp),
        ...(internal && { demarche_numerique_reason: demarcheNumeriqueReason }),
      }),
    ),
};

export const internalDossierResources = {
  prescriptions: readPrescriptions,
  controles: async (id: DossierId, trx: Knex.Transaction) =>
    getControles(
      (await readPrescriptions(id, trx)).map(({ id }) => id),
      trx,
    ),
  comments: getDossierCommentaires,
  history: getDossierActions,
  "cnpn-emails": getDossierCnpnEmailSentEvents,
};

async function readEspeceImpacts(id: DossierId, trx: Knex.Transaction) {
  return (await getImpactOnEspeces(id, trx)).map((impact) => ({
    espece: {
      cd_ref: impact.espece.CD_REF,
      common_name: impact.espece.nomVernaculaire,
      scientific_name: impact.espece.nomScientifique,
      espece_cnpn: impact.espece.especeCNPN,
      espece_ministerielle: impact.espece.especeMinisterielle,
      red_list_status: impact.espece.statutListeRouge,
    },
    impact_type: impact.typeImpact
      ? {
          pitchou_id: impact.typeImpact.identifiantPitchou,
          label: impact.typeImpact.libelle,
          allowed_criteria: impact.typeImpact.criteriaAllowed,
        }
      : null,
    method: impact.methode,
    moyen_de_poursuite: impact.moyenDePoursuite,
    individual_count: impact.nombreIndividus,
    nest_count: impact.nids,
    egg_count: impact.oeufs,
    destroyed_habitat_area: impact.surfaceHabitatDetruit,
  }));
}

export function listDossierFollowers(
  dossier: DossierId,
  userId: UserId | null,
  internal: boolean,
  trx: Knex.Transaction,
) {
  const query = trx("edge_personne_follows_dossier as follow")
    .join("auth_user as personne", "personne.id", "follow.personne")
    .where("follow.dossier", dossier)
    .whereNotNull("personne.email")
    .select("personne.email")
    .orderBy("personne.email");
  if (!internal) {
    if (userId === null) return Promise.resolve([]);
    query.where("personne.id", userId);
  }
  return query;
}
