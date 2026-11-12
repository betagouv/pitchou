import { writeReviewedGroup } from "./link-existing/write.mjs";
import { lockDossierAccess } from "../../../libs/server/src/dossierRouting.ts";
import { dossiersAccessibleToUser } from "../../../libs/server/src/database/dossier/access.ts";
import { getReviewer } from "./routing.mjs";
import { reconciliationTargets } from "./reconciliation.mjs";
import { reconciliationHash, readReconciledLinks } from "./linked.mjs";
import { readExcludedCandidates } from "./exclusions.mjs";
import { reviewedRelatedCandidates } from "./related.mjs";
import { assertSharedReplay, writeSharedTarget } from "./link-existing/shared.mjs";
import {
  reviewedGroups,
  assertReviewedCandidates,
  reviewedTarget,
} from "./link-existing/review.mjs";

/** Explicit local review links preserve each DN record and its business data. */
export async function linkExistingDemandes(client, entries, reviewerEmail) {
  const groups = reviewedGroups(entries);
  await lockDossierAccess(client.trx);
  await client.query(
    "LOCK TABLE dossier, dossier_demande, dossier_projet IN SHARE ROW EXCLUSIVE MODE",
  );
  if (entries.some((entry) => entry.decision.targetEvidenceHash))
    await client.query(
      "LOCK TABLE decision_administrative, avis_expert, commentaire IN SHARE MODE",
    );
  const reviewer = await getReviewer(client, reviewerEmail);
  const targetIds = entries.flatMap(({ decision }) => [
    decision.dossierId,
    ...(decision.relatedExisting ?? []).map((entry) => entry.dossierId),
  ]);
  const access = await dossiersAccessibleToUser(targetIds, reviewer.id, client.trx);
  if (targetIds.some((id) => access.get(id) !== "complet"))
    throw new Error("Reviewer must have full access to every target");
  const targets = await reconciliationTargets(client);
  const result = [];
  // Review every group before any membership is written.
  for (const group of groups) {
    const excluded = await readExcludedCandidates(client, group.project);
    const related = await reviewedRelatedCandidates(
      client,
      group.entries.map((e) => e.decision),
    );
    if ([...related].some((id) => excluded.has(id)))
      throw new Error("A related DN entry cannot also be classified as an unrelated candidate");
    if (group.entries.some((e) => excluded.has(e.decision.dossierId)))
      throw new Error("An excluded pair cannot be linked without a new explicit review");
    group.existing = await readReconciledLinks(client, group.project);
    if (group.existing.length > 0) {
      assertExactReplay(group);
      continue;
    }
    assertReviewedCandidates(
      group,
      targets.filter((target) => !excluded.has(target.id) && !related.has(target.id)),
    );
    if (
      (
        await client.query("SELECT 1 FROM onagre_local_import.identity WHERE source_key=$1", [
          group.project.identity.key,
        ])
      ).rows.length > 0
    )
      throw new Error("An existing imported project requires explicit grouping reconciliation");
    for (const entry of group.entries)
      entry.current = await reviewedTarget(client, group.project, entry.demande, entry.decision);
  }
  const writtenShared = new Set();
  assertSharedReplay(groups);
  for (const group of groups) {
    if (group.existing.length > 0) {
      for (const entry of group.entries)
        result.push({
          projectId: group.project.identity.sourceId,
          dossierId: entry.decision.dossierId,
          status: "unchanged",
        });
    } else if (group.sharedTargetId) {
      if (!writtenShared.has(group.sharedTargetId)) {
        result.push(
          ...(await writeSharedTarget(
            client,
            groups.filter((g) => g.sharedTargetId === group.sharedTargetId),
            reviewer.id,
          )),
        );
        writtenShared.add(group.sharedTargetId);
      }
    } else result.push(...(await writeReviewedGroup(client, group, reviewer.id)));
  }
  return result;
}

function assertExactReplay(group) {
  if (
    group.entries.length !== group.existing.length ||
    group.entries.some(({ decision }) => {
      const link = group.existing.find((row) => row.source_key === decision.demandeKey);
      return (
        !link ||
        link.dossier_id !== decision.dossierId ||
        reconciliationHash(link.decision) !== reconciliationHash(decision)
      );
    })
  )
    throw new Error("An existing reconciliation decision cannot be replaced implicitly");
  if (new Set(group.existing.map((row) => row.project_id)).size !== 1)
    throw new Error("Reconciled demandes must remain in the same project");
}
