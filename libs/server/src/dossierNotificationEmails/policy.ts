import { dossierAccessSql } from "../dossierRouting/access.ts";

const internalActions = [
  "phase_renseignee",
  "prochaine_action_renseignee",
  "echeance_renseignee",
  "ddep_renseignee",
  "enjeu_renseigne",
  "onagre_renseigne",
  "dates_consultation_renseignees",
  "commentaire_ajoute",
  "commentaire_modifie",
  "commentaire_supprime",
  "piece_jointe_importee",
  "saisine_importee",
  "avis_importe",
  "avis_modifie",
  "avis_supprime",
  "decision_importee",
  "decision_modifiee",
  "decision_supprime",
  "prescription_ajoutee",
  "prescription_modifiee",
  "prescription_supprimee",
  "controle_ajoute",
  "controle_modifie",
  "controle_supprime",
  "controle_retour_conformite",
];

export function actionNotBaselineSql(a = "a") {
  return `(COALESCE(${a}.data->>'baseline', 'false') <> 'true'
    AND COALESCE(${a}.data->>'notification_legacy', 'false') <> 'true'
    AND COALESCE(${a}.data->>'email_notification', 'true') <> 'false')`;
}

export function actionVisibleSql(a: string, restricted: string) {
  return `(${actionNotBaselineSql(a)} AND COALESCE(
    (${a}.author_petitionnaire AND ${a}.data->>'notification' = 'true')
    OR (NOT ${a}.author_petitionnaire AND ${a}.author_personne IS NOT NULL
      AND ((${restricted} AND ${a}.type = 'phase_renseignee')
        OR (NOT (${restricted}) AND ${a}.type IN (${internalActions.map((type) => `'${type}'`).join(",")})))), false))`;
}

export function deliveryTimeSql(timestamp: string) {
  return `((date_trunc('day', ${timestamp} AT TIME ZONE 'Europe/Paris') + interval '6 hours'
    + CASE WHEN (${timestamp} AT TIME ZONE 'Europe/Paris')::time >= time '06:00'
      THEN interval '1 day' ELSE interval '0 days' END) AT TIME ZONE 'Europe/Paris')`;
}

export function notificationEligibleSql(dossier: string, user: string, batch: string) {
  return `(CASE ${dossierAccessSql(dossier, user)}
    WHEN 'complet' THEN true WHEN 'lecture_complete' THEN true
    WHEN 'lecture' THEN EXISTS (SELECT 1 FROM action_dossier eligible_action
      WHERE eligible_action.dossier = ${dossier} AND ${actionVisibleSql("eligible_action", "true")}
        AND (eligible_action.author_personne IS NULL OR eligible_action.author_personne <> ${user})
        AND (${deliveryTimeSql("eligible_action.created_at")} AT TIME ZONE 'Europe/Paris')::date::text = ${batch})
    ELSE false END)`;
}

export function cancellationReasonSql(n = "n") {
  return `(CASE
    WHEN NOT EXISTS (SELECT 1 FROM dossier WHERE id = ${n}.dossier) THEN 'dossier_deleted'
    WHEN NOT EXISTS (SELECT 1 FROM auth_user WHERE id = ${n}.personne) THEN 'recipient_deleted'
    WHEN EXISTS (SELECT 1 FROM email_notification_preferences p WHERE p.personne = ${n}.personne
      AND ((${n}.kind = 'arrival' AND NOT p.arrival) OR (${n}.kind = 'assignment' AND NOT p.assignment)
        OR (${n}.kind = 'novelty' AND NOT p.novelty))) THEN 'disabled_preference'
    WHEN ${dossierAccessSql(`${n}.dossier`, `${n}.personne`)} IS NULL THEN 'lost_access'
    WHEN ${n}.kind = 'novelty' AND NOT ${notificationEligibleSql(`${n}.dossier`, `${n}.personne`, `${n}.batch_key`)} THEN 'lost_access'
    WHEN ${n}.kind <> 'arrival' AND NOT EXISTS (SELECT 1 FROM edge_personne_follows_dossier f
      WHERE f.personne = ${n}.personne AND f.dossier = ${n}.dossier) THEN 'unfollowed_dossier'
    WHEN ${n}.kind = 'arrival' AND NOT EXISTS (SELECT 1 FROM email_notification_groupe_arrival a
      JOIN user_groupe m ON m.groupe_instructeurs = a.groupe_instructeurs
      JOIN groupe_instructeurs g ON g.id = m.groupe_instructeurs AND g.active
      WHERE a.dossier = ${n}.dossier AND a.revision::text = ${n}.batch_key
        AND m.user_id = ${n}.personne) THEN 'transferred_group'
    WHEN NOT EXISTS (SELECT 1 FROM auth_user WHERE id = ${n}.personne AND email IS NOT NULL)
      THEN 'missing_recipient_address'
    ELSE NULL END)`;
}
