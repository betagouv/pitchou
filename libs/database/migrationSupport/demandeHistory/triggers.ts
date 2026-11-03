import type { Knex } from "knex";

const changed = (key: string) => `SELECT DISTINCT (value->>'${key}') FROM
  jsonb_array_elements(jsonb_build_array($1, $2)) WHERE value->>'${key}' IS NOT NULL`;

export async function installHistoryTriggers(db: Knex) {
  const owners: Record<string, string> = {
    dossier: `SELECT value::integer FROM (${changed("id")}) ids(value)`,
    ...Object.fromEntries(
      [
        "avis_expert",
        "dossier_cnpn_email_sent_event",
        "decision_administrative",
        "evenement_phase_dossier",
        "impact_espece",
        "commentaire",
        "other_attachment",
        "dossier_acteur",
        "edge_dossier__fichier_pieces_jointes_petitionnaire",
      ].map((table) => [table, `SELECT value::integer FROM (${changed("dossier")}) ids(value)`]),
    ),
    prescription: `SELECT dossier FROM decision_administrative WHERE id::text IN (${changed("decision_administrative")})`,
    controle: `SELECT da.dossier FROM prescription p JOIN decision_administrative da ON da.id = p.decision_administrative
      WHERE p.id::text IN (${changed("prescription")})`,
    porteur_de_projet: `SELECT id FROM dossier WHERE porteur_de_projet::text IN (${changed("id")})`,
    personne_physique: `SELECT d.id FROM dossier d JOIN porteur_de_projet p ON p.id = d.porteur_de_projet
      WHERE p.personne_physique::text IN (${changed("id")})
      UNION SELECT dossier FROM dossier_acteur WHERE personne_physique::text IN (${changed("id")})`,
    entreprise: `SELECT d.id FROM dossier d JOIN porteur_de_projet p ON p.id = d.porteur_de_projet
      WHERE p.personne_morale IN (${changed("siret")})`,
    activite_label: `SELECT id FROM dossier WHERE main_activite IN (${changed("label")})`,
    activite: `SELECT d.id FROM dossier d JOIN activite_label a ON a.label = d.main_activite
      WHERE a.activite_code IN (${changed("code")})`,
    impact_type: `SELECT DISTINCT dossier FROM impact_espece WHERE impact_type IN (${changed("identifiant_pitchou")})`,
    impact_methode: `SELECT DISTINCT dossier FROM impact_espece WHERE impact_methode IN (${changed("code")})`,
    impact_moyen_de_poursuite: `SELECT DISTINCT dossier FROM impact_espece WHERE impact_moyen_de_poursuite IN (${changed("code")})`,
    file: `SELECT dossier FROM avis_expert WHERE avis_fichier::text IN (${changed("id")}) OR saisine_fichier::text IN (${changed("id")})
      UNION SELECT dossier FROM decision_administrative WHERE fichier::text IN (${changed("id")})
      UNION SELECT id FROM dossier WHERE especes_impactees::text IN (${changed("id")})
      UNION SELECT dossier FROM impact_espece WHERE source_file::text IN (${changed("id")})
      UNION SELECT dossier FROM other_attachment WHERE fichier::text IN (${changed("id")})
      UNION SELECT dossier FROM edge_dossier__fichier_pieces_jointes_petitionnaire WHERE fichier::text IN (${changed("id")})`,
  };
  for (const [table, query] of Object.entries(owners)) {
    await db.raw(
      `CREATE TRIGGER queue_demande_revision BEFORE INSERT OR UPDATE OR DELETE ON ??
      FOR EACH ROW EXECUTE FUNCTION queue_demande_revision('${query.replaceAll("'", "''")}')`,
      [table],
    );
  }
}
