import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

export function formatDossierFull(ret: DossierFull): DossierFull {
  for (const key of [
    "intervention_start_date",
    "intervention_end_date",
    "depot_date",
    "public_consultation_start_date",
    "public_consultation_end_date",
  ] as const) {
    if (ret[key]) ret[key] = new Date(ret[key]);
  }

  if (ret.especesImpactees) Object.freeze(ret.especesImpactees);
  if (ret.evenementsPhase) Object.freeze(ret.evenementsPhase);
  if (ret.cnpnEmailSentEvents) {
    ret.cnpnEmailSentEvents = ret.cnpnEmailSentEvents.map((event) => ({
      ...event,
      sent_at: new Date(event.sent_at),
      delivered_at: event.delivered_at ? new Date(event.delivered_at) : null,
      opened_at: event.opened_at ? new Date(event.opened_at) : null,
    }));
    Object.freeze(ret.cnpnEmailSentEvents);
  }

  for (const avisExpert of ret.avisExpert) {
    if (avisExpert.saisine_fichier_description?.created_at) {
      avisExpert.saisine_fichier_description.created_at = new Date(
        avisExpert.saisine_fichier_description.created_at,
      );
    }
    if (avisExpert.avis_fichier_description?.created_at) {
      avisExpert.avis_fichier_description.created_at = new Date(
        avisExpert.avis_fichier_description.created_at,
      );
    }
  }

  if (ret.decisionsAdministratives) {
    ret.decisionsAdministratives = ret.decisionsAdministratives.map((decision) => {
      if (decision.signature_date) decision.signature_date = new Date(decision.signature_date);
      if (decision.obligations_end_date) {
        decision.obligations_end_date = new Date(decision.obligations_end_date);
      }
      for (const prescription of decision.prescriptions ?? []) {
        if (prescription.due_date) prescription.due_date = new Date(prescription.due_date);
        for (const controle of prescription.controles ?? []) {
          if (controle.controle_date) controle.controle_date = new Date(controle.controle_date);
          if (controle.post_controle_action_date) {
            controle.post_controle_action_date = new Date(controle.post_controle_action_date);
          }
          if (controle.next_due_date) controle.next_due_date = new Date(controle.next_due_date);
        }
      }
      return decision;
    });
  }

  if (ret.otherAttachments) {
    ret.otherAttachments = ret.otherAttachments.map((attachment) => {
      if (attachment.attachment_date)
        attachment.attachment_date = new Date(attachment.attachment_date);
      if (attachment.created_at) attachment.created_at = new Date(attachment.created_at);
      return attachment;
    });
  }

  Object.freeze(ret);
  return ret;
}
