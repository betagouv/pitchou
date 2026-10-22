import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { json, error } from "@sveltejs/kit";
import { getMaxUploadSizeBytes } from "@pitchou/server/upload.ts";
import type { RequestHandler } from "./$types";
const endpoints = {
  listerDossiers: "/dossiers",
  exporterDossiers: "/dossiers/export",
  recupérerDossierComplet: "/dossier/:dossierId",
  listFollowRelations: "/dossiers/relation-suivis",
  updateFollowRelation: "/dossiers/relation-suivis",
  listDossierFollowerCandidates: "/dossier/:dossierId/followers",
  updateDossierFollowers: "/dossier/:dossierId/followers",
  listerEvenementsPhaseDossier: "/dossiers/evenements-phases",
  listerActionsDossier: "/dossier/:dossierId/historique",
  listerCommentaires: "/dossier/:dossierId/commentaires",
  ajouterCommentaire: "/dossier/:dossierId/commentaires",
  modifierCommentaire: "/dossier/:dossierId/commentaires",
  supprimerCommentaire: "/dossier/:dossierId/commentaires",
  modifierDossier: "/dossier/:dossierId",
  envoyerEmailCnpn: "/dossier/:dossierId/cnpn-email",
  modifierDecisionAdministrativeDansDossier: "/decision-administrative",
  deleteDecisionAdministrative: "/decision-administrative/:decisionAdministrativeId",
  addOrUpdatePrescription: "/prescription",
  addPrescriptionsAndControles: "/prescriptions-et-controles",
  deletePrescription: "/prescription/:prescriptionId",
  addOrUpdateControle: "/controle",
  deleteControle: "/controle/:controleId",
  addOrUpdateAvisExpert: "/avis-expert",
  addOtherAttachment: "/attachment-autre",
  deletePieceJointe: "/piece-jointe",
  createUploadUrls: "/fichier/upload-url",
  deleteAvisExpert: "/avis-expert/:avisExpertId",
  creerEvenementMetrique: "/api/metriques/evenements",
  listRecentSearches: "/api/metriques/dernieres-recherches",
  listerNotifications: "/dossiers/notifications",
  updateNotificationForDossier: "/dossiers/notifications",
};
const readActions = new Set([
  "listerDossiers",
  "exporterDossiers",
  "recupérerDossierComplet",
  "listRecentSearches",
  "creerEvenementMetrique",
]);
export const GET: RequestHandler = async ({ locals }) => {
  const user = locals.user;
  if (!user) error(401, "Authentification requise");
  const canRead = user.groupes.length > 0 && user.permissions.includes("dossier:read");
  const canInstruct = canRead && user.permissions.includes("dossier:instruct");
  const revision = await db("administration_event").max("id as id").first();
  return json({
    authorizationVersion: JSON.stringify([user.id, user.groupes, user.permissions, revision?.id]),
    ...(canRead
      ? Object.fromEntries(
          Object.entries(endpoints).filter(([key]) => canInstruct || readActions.has(key)),
        )
      : {}),
    identité: {
      email: user.email,
      estAdmin: user.permissions.includes("admin:access"),
      groupesInstructeurs: user.groupes.map((g) => g.name),
    },
    permissions: user.permissions,
    maxUploadSizeBytes: getMaxUploadSizeBytes(),
  });
};
