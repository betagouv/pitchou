CREATE FUNCTION demande_files(target integer)
RETURNS TABLE(fichier uuid, relation text, expert text) LANGUAGE sql STABLE AS $$
  SELECT avis_fichier, 'avis', coalesce(expert, '') FROM avis_expert WHERE dossier = target AND avis_fichier IS NOT NULL
  UNION SELECT saisine_fichier, 'saisine', coalesce(expert, '') FROM avis_expert WHERE dossier = target AND saisine_fichier IS NOT NULL
  UNION SELECT fichier, 'decision-administrative', '' FROM decision_administrative WHERE dossier = target AND fichier IS NOT NULL
  UNION SELECT especes_impactees, 'especes-impactees', '' FROM dossier WHERE id = target AND especes_impactees IS NOT NULL
  UNION SELECT source_file, 'especes-impactees', '' FROM impact_espece WHERE dossier = target
  UNION SELECT fichier, 'piece-jointe-petitionnaire', '' FROM edge_dossier__fichier_pieces_jointes_petitionnaire WHERE dossier = target
  UNION SELECT fichier, 'attachment-autre', '' FROM other_attachment WHERE dossier = target;
$$;

CREATE FUNCTION demande_state(target integer) RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'dossier', to_jsonb(d) || jsonb_build_object('activite_code', a.code, 'activite_label', a.label),
    'porteur', CASE WHEN p.personne_physique IS NOT NULL THEN
      (SELECT to_jsonb(pp) - 'id' || '{"type":"personne_physique"}' FROM personne_physique pp WHERE pp.id = p.personne_physique)
      WHEN p.personne_morale IS NOT NULL THEN
      (SELECT to_jsonb(e) || '{"type":"personne_morale"}' FROM entreprise e WHERE e.siret = p.personne_morale)
      ELSE null END,
    'acteurs', coalesce((SELECT jsonb_agg(x.personne || jsonb_build_object('involvements', x.involvements) ORDER BY x.id)
      FROM (SELECT pp.id, to_jsonb(pp) - 'id' AS personne, jsonb_agg(da.involvement ORDER BY da.involvement) AS involvements
        FROM dossier_acteur da JOIN personne_physique pp ON pp.id = da.personne_physique
        WHERE da.dossier = target GROUP BY pp.id) x), '[]'),
    'phases', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.timestamp, x.phase) FROM evenement_phase_dossier x WHERE x.dossier = target), '[]'),
    'avis', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.id) FROM avis_expert x WHERE x.dossier = target), '[]'),
    'decisions', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.id) FROM decision_administrative x WHERE x.dossier = target), '[]'),
    'prescriptions', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.id) FROM prescription x
      JOIN decision_administrative da ON da.id = x.decision_administrative WHERE da.dossier = target), '[]'),
    'controles', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.id) FROM controle x
      JOIN prescription pr ON pr.id = x.prescription JOIN decision_administrative da ON da.id = pr.decision_administrative
      WHERE da.dossier = target), '[]'),
    'impacts', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.id) FROM impact_espece x WHERE x.dossier = target), '[]'),
    'especes', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.cd_ref) FROM espece_protegee x
      WHERE x.cd_ref IN (SELECT cd_ref FROM impact_espece WHERE dossier = target)), '[]'),
    'impactTypes', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.identifiant_pitchou) FROM impact_type x
      WHERE x.identifiant_pitchou IN (SELECT impact_type FROM impact_espece WHERE dossier = target)), '[]'),
    'impactMethodes', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.code) FROM impact_methode x
      WHERE x.code IN (SELECT impact_methode FROM impact_espece WHERE dossier = target)), '[]'),
    'impactMoyens', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.classification, x.code) FROM impact_moyen_de_poursuite x
      WHERE (x.classification, x.code) IN (SELECT classification, impact_moyen_de_poursuite FROM impact_espece WHERE dossier = target)), '[]'),
    'commentaires', coalesce((SELECT jsonb_agg(to_jsonb(x) || jsonb_build_object('author_email', u.email) ORDER BY x.created_at, x.id)
      FROM commentaire x LEFT JOIN auth_user u ON u.id = x.personne WHERE x.dossier = target), '[]'),
    'cnpnEmails', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.id) FROM (
      SELECT id, dossier, sent_by_email, sent_at, delivered_at, opened_at, delivery_failed_at,
        delivery_failure_reason, recipient_email, cc_emails, subject, attachment_ids, attachment_names
      FROM dossier_cnpn_email_sent_event WHERE dossier = target AND status = 'sent') x), '[]'),
    'attachments', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.id) FROM other_attachment x WHERE x.dossier = target), '[]'),
    'pieces', coalesce((SELECT jsonb_agg(x.fichier ORDER BY x.fichier) FROM edge_dossier__fichier_pieces_jointes_petitionnaire x WHERE x.dossier = target), '[]'),
    'files', coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.id) FROM file f WHERE f.id IN (SELECT fichier FROM demande_files(target))), '[]')
  ) FROM dossier d
  LEFT JOIN porteur_de_projet p ON p.id = d.porteur_de_projet
  LEFT JOIN activite_label al ON al.label = d.main_activite AND NOT al.needs_review
  LEFT JOIN activite a ON a.code = al.activite_code
  WHERE d.id = target;
$$;
