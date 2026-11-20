import {
  createOnagreMatcher,
  normalizeOnagreReference,
  onagreReferences,
} from "../../../libs/server/src/onagre/reconciliation.ts";
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
  const match = createOnagreMatcher(targets);
  const reconciled = new Map();
  const excluded = new Map();
  const blockedSiblings = new Set();
  const conflicts = [];
  for (const project of projects) {
    const source = reconciliationSource(project);
    const exclusions = await readExcludedCandidates(client, project);
    excluded.set(source.projectId, exclusions);
    const links = await readReconciledLinks(client, project);
    const related = await reviewedRelatedCandidates(
      client,
      links.map((link) => link.decision),
    );
    reconciled.set(
      source.projectId,
      new Set([...links.map((link) => link.dossier_id), ...related]),
    );
    const candidates = match(source).filter(
      (candidate) =>
        !reconciled.get(source.projectId).has(candidate.dossierId) &&
        !exclusions.has(candidate.dossierId),
    );
    const unlinked = project.demandes.filter(
      (demande) => !links.some((link) => link.source_key === demande.identity.key),
    );
    if (candidates.length > 0 && (links.length === 0 || unlinked.length === 0))
      conflicts.push({ projectId: source.projectId, projectName: source.name, candidates });
    if (
      links.length > 0 &&
      unlinked.length > 0 &&
      (candidates.length > 0 || !confirmedSingleDemandeScope(project, source, links))
    )
      blockedSiblings.add(source.projectId);
  }
  if (conflicts.length > 0) {
    const error = new Error(
      `Existing Pitchou records require reconciliation for ${conflicts.length} Onagre project(s). No automatic adoption or merge.`,
    );
    error.reconciliation = conflicts;
    throw error;
  }
  return { excluded, blockedSiblings };
}

function confirmedSingleDemandeScope(project, source, links) {
  if (links.length !== 1 || project.omittedDemandes?.length) return false;
  const [link] = links;
  const demande = project.demandes.find((entry) => entry.identity.key === link.source_key);
  const targetReferences = onagreReferences(link.current.onagre_demande_identifier);
  const explicit = source.demandes.filter(
    ({ code }) => code && targetReferences.has(normalizeOnagreReference(code)),
  );
  return explicit.length === 1 && explicit[0].id === demande?.identity.sourceId;
}
