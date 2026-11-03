export const kindLabels: Record<string, string> = {
  cnpn: "Saisine CNPN",
  arrival: "Arrivée",
  assignment: "Attribution",
  novelty: "Nouveauté",
};
export const statusLabels: Record<string, string> = {
  failed: "Échec",
  pending: "En attente",
  sent: "Pris en charge par Brevo",
  cancelled: "Annulé",
  uncertain: "Incertain",
  suppressed: "Bloqué en préproduction",
};
export const environmentLabels: Record<string, string> = {
  production: "Production",
  staging: "Préproduction",
  development: "Développement",
  test: "Test automatisé",
  preview: "Aperçu",
  unrecorded: "Non enregistré",
};
export const eventLabels: Record<string, string> = {
  created: "Création de la demande d’envoi",
  delivered: "Réception confirmée par le CNPN",
  opened: "Ouverture détectée",
  read_receipt: "Accusé de lecture envoyé",
  queued: "Mise en file",
  attempted: "Tentative",
  sent: "Pris en charge par Brevo",
  soft_bounce: "Échec de livraison signalé par Brevo",
  hard_bounce: "Livraison refusée définitivement",
  blocked: "Livraison bloquée",
  invalid_email: "Adresse du destinataire invalide",
  error: "Erreur de livraison",
  delivery_failed: "Échec de livraison",
  failure_notification: "Alerte d'échec envoyée à l'instructeur",
  failure_notification_uncertain: "Envoi de l'alerte à l'instructeur à vérifier dans Brevo",
  failed: "Échec de tentative",
  cancelled: "Annulation",
  uncertain: "Envoi incertain",
  suppressed: "Envoi bloqué en préproduction",
};
export const reasonLabels: Record<string, string> = {
  staging_allowlist: "Destinataire non autorisé en préproduction",
  disabled_preference: "Préférence désactivée",
  unfollowed_dossier: "Suivi quitté",
  lost_access: "Accès au groupe perdu",
  transferred_group: "Dossier transféré",
  dossier_deleted: "Dossier supprimé",
  recipient_deleted: "Compte supprimé",
  missing_recipient_address: "Adresse absente",
  deduplication_window_expired: "Fenêtre de reprise dépassée",
  configuration: "Configuration absente",
  rate_limited: "Limite d'envoi atteinte",
  authentication: "Authentification du service",
  timeout: "Délai dépassé",
  provider_unavailable: "Service indisponible",
  provider_rejected: "Envoi refusé",
  network: "Erreur réseau",
  unknown: "Erreur non identifiée",
  legacy_error: "Erreur historique",
};
export function formatDate(value: Date | string | null) {
  return value ? new Date(value).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "—";
}

export function emailStatusLabel(row: {
  source: string;
  status: string;
  sent_at: Date | string | null;
  delivered_at: Date | string | null;
  opened_at: Date | string | null;
}) {
  if (row.source === "notification" && row.status === "failed") return "Échec de livraison signalé";
  if (row.source === "cnpn") {
    if (row.status === "failed" && row.sent_at) return "Échec de livraison";
    if (row.opened_at) return "Ouverture détectée";
    if (row.delivered_at) return "Distribué au destinataire";
  }
  return statusLabels[row.status] ?? row.status;
}
