import { createOnagreMatcher } from "../../../libs/server/src/onagre/reconciliation.ts";
import { readReconciledLinks } from "./linked.mjs";
import { readExcludedCandidates } from "./exclusions.mjs";
import { reviewedRelatedCandidates } from "./related.mjs";

export function reconciliationSource(project) {
  const rows = project.demandes.flatMap((d) => d.source?.rows?.projet ?? []);
  const original = rows.find((p) => p.projetid === project.identity.sourceId);
  const demandes = new Map();
  for (const d of project.demandes) {
    if (d.identity.sourceTable === "demandes")
      demandes.set(d.identity.sourceId, d.proposal.dossier.onagre_demande_identifier);
    for (const sibling of d.source?.relatedDemandes ?? [])
      if (sibling.code) demandes.set(sibling.id, sibling.code);
  }
  return {
    projectId: project.identity.sourceId,
    projectCode: original?.codeprojet ?? null,
    name: project.proposal.name,
    departments: [
      ...new Set(project.demandes.flatMap((d) => d.proposal.dossier.departments ?? [])),
    ],
    demandes: [...demandes].map(([id, code]) => ({ id, code })),
  };
}

export async function reconciliationTargets(client) {
  const identityExists = (
    await client.query("SELECT to_regclass('onagre_local_import.identity') IS NOT NULL AS exists")
  ).rows[0].exists;
  // Only this importer's stable identities establish ownership, never dossier.source alone.
  const excludeOwned = identityExists
    ? `WHERE NOT EXISTS (
        SELECT 1 FROM onagre_local_import.identity i
        WHERE i.table_name='dossier' AND i.target_id=d.id::text AND i.source_key=i.dossier_key
      )`
    : "";
  return (
    await client.query(`SELECT d.id,d.name,d.onagre_demande_identifier,d.departments,d.primary_department
      FROM public.dossier d ${excludeOwned} ORDER BY d.id`)
  ).rows;
}

export function reconcileProjects(sources, targets) {
  const match = createOnagreMatcher(targets);
  return sources.map((source) => ({
    projectId: source.projectId,
    projectName: source.name,
    candidates: match(source),
  }));
}

export async function assertNoUnreviewedDuplicates(client, projects) {
  // Prevent a concurrent insertion/edit from invalidating the candidate check before commit.
  await client.query("LOCK TABLE public.dossier IN SHARE ROW EXCLUSIVE MODE");
  const targets = await reconciliationTargets(client);
  const reconciled = new Map();
  const excluded = new Map();
  for (const project of projects) {
    excluded.set(project.identity.sourceId, await readExcludedCandidates(client, project));
    const links = await readReconciledLinks(client, project);
    if (
      links.length > 0 &&
      project.demandes.some((d) => !links.some((link) => link.source_key === d.identity.key))
    )
      throw new Error(
        `Additional Onagre demandes require a scope review before import: ${project.identity.key}`,
      );
    const related = await reviewedRelatedCandidates(
      client,
      links.map((link) => link.decision),
    );
    reconciled.set(
      project.identity.sourceId,
      new Set([...links.map((link) => link.dossier_id), ...related]),
    );
  }
  const conflicts = reconcileProjects(projects.map(reconciliationSource), targets)
    .map((project) => ({
      ...project,
      candidates: project.candidates.filter(
        (candidate) =>
          !reconciled.get(project.projectId).has(candidate.dossierId) &&
          !excluded.get(project.projectId).has(candidate.dossierId),
      ),
    }))
    .filter((project) => project.candidates.length > 0);
  if (conflicts.length > 0) {
    const error = new Error(
      `Existing Pitchou records require reconciliation for ${conflicts.length} Onagre project(s). No automatic adoption or merge.`,
    );
    error.reconciliation = conflicts;
    throw error;
  }
  return excluded;
}
