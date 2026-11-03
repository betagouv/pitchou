import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { ComparisonSection } from "@pitchou/types/demandeComparison.ts";
import { record } from "./fields.ts";

export function chronologySections(dossier: DossierFull): ComparisonSection[] {
  return [
    {
      key: "phases",
      label: "Changements de phase",
      records: dossier.evenementsPhase.map((event) =>
        record(event.phase, event.phase, event, {
          phase: "Phase",
          timestamp: "Date",
          demarche_numerique_motivation: "Motivation",
        }),
      ),
    },
    {
      key: "emails",
      label: "Envois au CNPN",
      records: (dossier.cnpnEmailSentEvents ?? []).map((event) =>
        record(
          event.subject,
          event.subject,
          event,
          {
            subject: "Objet",
            sent_by_email: "Expéditeur",
            recipient_email: "Destinataire",
            cc_emails: "Copie",
            sent_at: "Envoi",
            delivered_at: "Livraison",
            opened_at: "Ouverture",
            delivery_failed_at: "Échec de livraison",
            delivery_failure_reason: "Motif de l’échec",
            attachment_names: "Documents joints",
          },
          `${dossier.id}:${event.id}`,
        ),
      ),
    },
  ];
}
