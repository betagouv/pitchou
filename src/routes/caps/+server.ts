import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireSecret } from "$lib/server/auth";
import { getInstructeurCapBundleByPersonneCodeAccès } from "$server/database.ts";
import type {
  IdentitéInstructeurPitchou,
  PitchouInstructeurCapabilities,
} from "$types/capabilities.ts";
import type { StringValues } from "$types/tools.d.ts";

type CapURLs = StringValues<PitchouInstructeurCapabilities> & {
  identité: IdentitéInstructeurPitchou;
};

export const GET: RequestHandler = async ({ url }) => {
  const codeAcces = requireSecret(url);
  const capBundle = await getInstructeurCapBundleByPersonneCodeAccès(codeAcces);

  const ret = Object.create(null) as CapURLs;

  if (capBundle.listerDossiers) {
    ret.listerDossiers = `/dossiers?cap=${capBundle.listerDossiers}`;
  }
  if (capBundle.recupérerDossierComplet) {
    ret.recupérerDossierComplet = `/dossier/:dossierId?cap=${capBundle.recupérerDossierComplet}`;
  }
  if (capBundle.listerRelationSuivi) {
    ret.listerRelationSuivi = `/dossiers/relation-suivis?cap=${capBundle.listerRelationSuivi}`;
  }
  if (capBundle.modifierRelationSuivi) {
    ret.modifierRelationSuivi = `/dossiers/relation-suivis?cap=${capBundle.modifierRelationSuivi}`;
  }
  if (capBundle.listerÉvènementsPhaseDossier) {
    ret.listerÉvènementsPhaseDossier = `/dossiers/evenements-phases?cap=${capBundle.listerÉvènementsPhaseDossier}`;
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
  if (capBundle.modifierDécisionAdministrativeDansDossier) {
    const cap = capBundle.modifierDécisionAdministrativeDansDossier;
    ret.modifierDécisionAdministrativeDansDossier = `/decision-administrative?cap=${cap}`;
    ret.deleteDecisionAdministrative = `/decision-administrative/:decisionAdministrativeId?cap=${cap}`;
    ret.addOrUpdatePrescription = `/prescription?cap=${cap}`;
    ret.addPrescriptionsAndControles = `/prescriptions-et-controles?cap=${cap}`;
    ret.deletePrescription = `/prescription/:prescriptionId?cap=${cap}`;
    ret.addOrUpdateControle = `/controle?cap=${cap}`;
    ret.deleteControle = `/controle/:controleId?cap=${cap}`;
    ret.addOrUpdateAvisExpert = `/avis-expert?cap=${cap}`;
    ret.deleteAvisExpert = `/avis-expert/:avisExpertId?cap=${cap}`;
  }
  if (capBundle.créerÉvènementMetrique) {
    ret.créerÉvènementMetrique = `/api/metriques/evenements?cap=${capBundle.créerÉvènementMetrique}`;
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

  return json(ret);
};
