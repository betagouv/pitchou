import { sharedDossierIdsSql } from "./projet.ts";

// These fragments accept only source-controlled SQL expressions, never request values.
// Keeping predicates here lets previews and bulk writes use the same rule semantics.
export function ruleMatchesSql(d = "d", r = "r") {
  return `((cardinality(${r}.departments) = 0 OR ${d}.primary_department = ANY(${r}.departments))
    AND (cardinality(${r}.communes) = 0 OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(${d}.communes::jsonb) = 'array'
        THEN ${d}.communes::jsonb ELSE '[]'::jsonb END) commune
      WHERE commune->>'code' = ANY(${r}.communes)))
    AND (cardinality(${r}.activites) = 0 OR COALESCE(
      (SELECT label.activite_code FROM activite_label label
        WHERE label.label = ${d}.main_activite AND NOT label.needs_review),
      CASE WHEN NULLIF(${d}.main_activite, '') IS NOT NULL THEN 'autre' END)
      = ANY(${r}.activites)))`;
}

export function groupMatchesSql(d = "d", group = "g.id") {
  return `(CASE WHEN EXISTS (SELECT 1 FROM dossier_demande WHERE dossier = ${d}.id) THEN
    EXISTS (SELECT 1 FROM dossier shared_d WHERE shared_d.id IN (${sharedDossierIdsSql(`${d}.id`)})
    AND ${localGroupMatchesSql("shared_d", group)}) ELSE ${localGroupMatchesSql(d, group)} END)`;
}

function localGroupMatchesSql(d: string, group: string) {
  return `(EXISTS (SELECT 1 FROM groupe_departement c
      WHERE c.groupe_instructeurs = ${group} AND c.department = ${d}.primary_department)
    OR EXISTS (SELECT 1 FROM group_routing_rule r WHERE r.groupe_instructeurs = ${group}
      AND ${ruleMatchesSql(d)}))`;
}

export function groupAccessSql(d = "d", group = "g.id") {
  return `(CASE WHEN EXISTS (SELECT 1 FROM dossier_demande WHERE dossier = ${d}.id) THEN
    (SELECT CASE WHEN bool_or(level = 'instruct') THEN 'instruct' ELSE 'read' END
    FROM (SELECT ${localGroupAccessSql("shared_d", group)} as level FROM dossier shared_d
      WHERE shared_d.id IN (${sharedDossierIdsSql(`${d}.id`)})) shared_grants
    WHERE level IS NOT NULL HAVING count(*) > 0) ELSE ${localGroupAccessSql(d, group)} END)`;
}

function localGroupAccessSql(d: string, group: string) {
  return `(SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM groupe_instructeurs active_group
      WHERE active_group.id = ${group} AND active_group.active) THEN NULL
    WHEN override.mode = 'exclude' THEN NULL
    WHEN override.mode = 'include' THEN override.access_level
    WHEN EXISTS (SELECT 1 FROM groupe_departement c
      WHERE c.groupe_instructeurs = ${group} AND c.department = ${d}.primary_department)
      THEN 'instruct'
    ELSE (SELECT CASE WHEN bool_or(r.access_level = 'instruct') THEN 'instruct' ELSE 'read' END
      FROM group_routing_rule r WHERE r.groupe_instructeurs = ${group}
        AND ${ruleMatchesSql(d)} HAVING count(*) > 0) END
    FROM (SELECT 1) singleton LEFT JOIN dossier_group_override override
      ON override.dossier = ${d}.id AND override.groupe_instructeurs = ${group})`;
}
