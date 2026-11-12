import { writeProject, writeMembership } from "../grouping.mjs";
import { existingIdentity } from "../linked.mjs";

export async function writeReviewedGroup(client, group, reviewerId) {
  const { project, entries } = group;
  const targetIds = new Set(entries.map((e) => e.decision.dossierId));
  const name =
    targetIds.size === 1 ? entries[0].current.name || project.proposal.name : project.proposal.name;
  const created = await writeProject(client, { ...project, proposal: { name } });
  const result = [];
  const writtenTargets = new Set();
  for (const {
    demande,
    decision,
    current,
    sourceProject = project,
    sourceHash = group.hash,
  } of entries) {
    const heldDemandeKeys = sourceProject.demandes
      .filter((d) => !entries.some((e) => e.demande.identity.key === d.identity.key))
      .map((d) => d.identity.key);
    if (!writtenTargets.has(decision.dossierId)) {
      const combined = entries.filter((e) => e.decision.dossierId === decision.dossierId);
      const label = combined
        .map((e) => e.demande.label)
        .sort()
        .join(" ; ");
      await writeMembership(client, { ...demande, label }, decision.dossierId, created.targetId);
      writtenTargets.add(decision.dossierId);
    }
    await client.query(
      `INSERT INTO onagre_local_import.reconciled_demande
      (source_key,project_key,source_hash,dossier_id,project_id,original_identity,decision,reviewed_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        decision.demandeKey,
        sourceProject.identity.key,
        sourceHash,
        decision.dossierId,
        created.targetId,
        JSON.stringify(existingIdentity(current)),
        JSON.stringify(decision),
        reviewerId,
      ],
    );
    result.push({
      projectId: sourceProject.identity.sourceId,
      demandeKey: decision.demandeKey,
      dossierId: decision.dossierId,
      projectUuid: created.targetId,
      status: "linked",
      heldDemandeKeys,
    });
  }
  return result;
}
