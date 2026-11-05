import type { Knex } from "knex";

/** Keep project membership identical in list and full-dossier payloads. */
export function withProjetMembership<T extends Knex.QueryBuilder>(
  query: T,
  transaction: Knex.Transaction,
  { batch = false } = {},
): T {
  query
    .leftJoin("dossier_demande as member", "member.dossier", "dossier.id")
    .leftJoin("dossier_projet as project", "project.id", "member.projet");
  if (batch) {
    query.leftJoin(
      transaction("dossier_demande")
        .select("projet")
        .count("* as count")
        .groupBy("projet")
        .as("project_count"),
      "project_count.projet",
      "member.projet",
    );
  }
  query.select(
    transaction.raw(`CASE WHEN project.id IS NOT NULL THEN jsonb_build_object(
        'id', project.id, 'name', project.name, 'demandeLabel', member.label,
        'count', ${batch ? "project_count.count" : "(SELECT count(*) FROM dossier_demande sibling WHERE sibling.projet = project.id)"}) END as projet`),
  );
  return query;
}
