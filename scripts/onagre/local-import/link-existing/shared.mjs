import { reconciliationHash } from "../linked.mjs";
import { writeReviewedGroup } from "./write.mjs";

/** Sharing a DN target across source projects requires an explicit, complete review. */
export function assertSharedTargets(groups) {
  const targets = new Map();
  for (const group of groups)
    for (const id of new Set(group.entries.map((e) => e.decision.dossierId))) {
      if (!targets.has(id)) targets.set(id, []);
      targets.get(id).push(group);
    }
  for (const [id, owners] of targets) {
    const keys = owners.map((g) => g.project.identity.key).sort();
    const shared = owners.length > 1;
    for (const group of owners) {
      if (!shared && group.entries.some((e) => e.decision.sharedTargetProjectKeys))
        throw new Error("The complete shared-target review must be supplied together");
      if (!shared) continue;
      if (
        group.entries.length !== group.project.demandes.length ||
        (group.project.omittedDemandes ?? []).length > 0 ||
        group.entries.some(
          ({ decision }) =>
            decision.dossierId !== id ||
            decision.matchProfile ||
            !Array.isArray(decision.sharedTargetProjectKeys) ||
            reconciliationHash([...decision.sharedTargetProjectKeys].sort()) !==
              reconciliationHash(keys) ||
            typeof decision.sharedTargetReview !== "string" ||
            decision.sharedTargetReview.trim().length < 80,
        )
      )
        throw new Error(
          "A target cannot represent two reviewed projects without a complete explicit shared-target review",
        );
      group.sharedTargetId = id;
    }
  }
}

export function assertSharedReplay(groups) {
  for (const group of groups.filter((g) => g.sharedTargetId)) {
    const owners = groups.filter((g) => g.sharedTargetId === group.sharedTargetId);
    const existing = owners.filter((g) => g.existing.length > 0);
    if (existing.length > 0 && existing.length !== owners.length)
      throw new Error("An existing shared target cannot be extended implicitly");
    if (new Set(existing.flatMap((g) => g.existing.map((r) => r.project_id))).size > 1)
      throw new Error("Shared source projects must retain the same existing DN grouping");
  }
}

export async function writeSharedTarget(client, owners, reviewerId) {
  const ordered = [...owners].sort((a, b) =>
    a.project.identity.key.localeCompare(b.project.identity.key),
  );
  // One Pitchou grouping, with every original source project retained in the provenance ledger.
  const combined = {
    ...ordered[0],
    entries: ordered.flatMap((group) =>
      group.entries.map((entry) => ({
        ...entry,
        sourceProject: group.project,
        sourceHash: group.hash,
      })),
    ),
  };
  return writeReviewedGroup(client, combined, reviewerId);
}
