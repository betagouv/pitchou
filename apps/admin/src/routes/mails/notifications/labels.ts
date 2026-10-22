export const kindLabels: Record<string, string> = {
  arrival: "Arrivée",
  assignment: "Attribution",
  novelty: "Nouveauté",
};
export const statusLabels: Record<string, string> = {
  pending: "En attente",
  sent: "Accepté par l'expéditeur",
  cancelled: "Annulé",
  uncertain: "Incertain",
};
export const environmentLabels: Record<string, string> = {
  production: "Production",
  staging: "Préproduction",
  development: "Développement",
  test: "Test automatisé",
  preview: "Aperçu Fleet",
};
export const eventLabels: Record<string, string> = {
  queued: "Mise en file",
  attempted: "Tentative",
  sent: "Accepté par l'expéditeur",
  failed: "Échec de tentative",
  cancelled: "Annulation",
  uncertain: "Envoi incertain",
};
export const reasonLabels: Record<string, string> = {
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
