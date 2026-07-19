import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireSecret } from "$lib/server/auth";
import { getMaxUploadSizeBytes } from "$lib/server/uploadLimit";
import { getInstructeurCapBundleByPersonneCodeAcces } from "@pitchou/server/database.ts";
import type {
  IdentiteInstructeurPitchou,
  PitchouInstructeurCapabilities,
} from "@pitchou/types/capabilities.ts";
import type { StringValues } from "@pitchou/types/tools.d.ts";

type CapURLs = StringValues<PitchouInstructeurCapabilities> & {
  identité: IdentiteInstructeurPitchou;
  maxUploadSizeBytes: number;
};

export const GET: RequestHandler = async ({ url }) => {
  const codeAcces = requireSecret(url);
  const capBundle = await getInstructeurCapBundleByPersonneCodeAcces(codeAcces);

  const ret = Object.create(null) as CapURLs;

  if (capBundle.listerDossiers) {
    ret.listerDossiers = `/dossiers?cap=${capBundle.listerDossiers}`;
  }
  if (capBundle.recupérerDossierComplet) {
    ret.recupérerDossierComplet = `/dossier/:dossierId?cap=${capBundle.recupérerDossierComplet}`;
  }
  if (capBundle.listFollowRelations) {
    ret.listFollowRelations = `/dossiers/relation-suivis?cap=${capBundle.listFollowRelations}`;
  }
  if (capBundle.updateFollowRelation) {
    ret.updateFollowRelation = `/dossiers/relation-suivis?cap=${capBundle.updateFollowRelation}`;
  }
  if (capBundle.listerEvenementsPhaseDossier) {
    ret.listerEvenementsPhaseDossier = `/dossiers/evenements-phases?cap=${capBundle.listerEvenementsPhaseDossier}`;
  }
  if (capBundle.listerMessages) {
    ret.listerMessages = `/dossier/:dossierId/messages?cap=${capBundle.listerMessages}`;
  }
  if (capBundle.modifierDossier) {
    ret.modifierDossier = `/dossier/:dossierId?cap=${capBundle.modifierDossier}`;
  }
  if (capBundle.remplirAnnotations) {
    ret.remplirAnnotations = `/remplir-annotations?cap=${capBundle.remplirAnnotations}`;
  }
  if (capBundle.modifierDecisionAdministrativeDansDossier) {
    const cap = capBundle.modifierDecisionAdministrativeDansDossier;
    ret.modifierDecisionAdministrativeDansDossier = `/decision-administrative?cap=${cap}`;
    ret.deleteDecisionAdministrative = `/decision-administrative/:decisionAdministrativeId?cap=${cap}`;
    ret.addOrUpdatePrescription = `/prescription?cap=${cap}`;
    ret.addPrescriptionsAndControles = `/prescriptions-et-controles?cap=${cap}`;
    ret.deletePrescription = `/prescription/:prescriptionId?cap=${cap}`;
    ret.addOrUpdateControle = `/controle?cap=${cap}`;
    ret.deleteControle = `/controle/:controleId?cap=${cap}`;
    ret.addOrUpdateAvisExpert = `/avis-expert?cap=${cap}`;
    ret.addOtherAttachment = `/attachment-autre?cap=${cap}`;
    ret.deleteAvisExpert = `/avis-expert/:avisExpertId?cap=${cap}`;
  }
  if (capBundle.creerEvenementMetrique) {
    ret.creerEvenementMetrique = `/api/metriques/evenements?cap=${capBundle.creerEvenementMetrique}`;
  }
  if (capBundle.identité) {
    ret.identité = capBundle.identité;
  }
  if (capBundle.listerNotifications) {
    ret.listerNotifications = `/dossiers/notifications?cap=${capBundle.listerNotifications}`;
  }
  if (capBundle.updateNotificationForDossier) {
    ret.updateNotificationForDossier = `/dossiers/notifications?cap=${capBundle.updateNotificationForDossier}`;
  }

  if (Object.keys(ret).length === 0) {
    error(403, "Code d'accès non valide.");
  }

  ret.maxUploadSizeBytes = getMaxUploadSizeBytes();

  return json(ret);
};
