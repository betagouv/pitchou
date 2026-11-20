import type { Knex } from "knex";
import {
  duplicateDecisionLabels,
  type DuplicateDecision,
  type DuplicateDecisionInput,
  type DuplicateOutcome,
  type DuplicateReview,
  type DuplicateRevision,
  type DuplicateWorkspace,
} from "@pitchou/types/onagreDuplicates.ts";
import { MappingConflict } from "./mappings.ts";
import { withReviewedLocations } from "./duplicates/locations.ts";
import { importedDuplicateDossier, loadImportedDuplicateDemandes } from "./duplicates/imported.ts";

export function parseDuplicateDecision(form: FormData): DuplicateDecisionInput {
  const get = (key: string) => String(form.get(key) ?? "").trim();
  const input = {
    project_id: get("project_id"),
    demande_key: get("demande_key"),
    review_hash: get("review_hash"),
    version: Number(get("version")),
    outcome: get("outcome") as DuplicateOutcome,
    reason: get("reason"),
  };
  if (
    !/^\d+$/u.test(input.project_id) ||
    !/^onagre-national:(?:demandes:\d+|projet:\d+:initial-demande)$/u.test(input.demande_key) ||
    !/^[a-f0-9]{64}$/u.test(input.review_hash) ||
    !get("version") ||
    !Number.isSafeInteger(input.version) ||
    input.version < 0 ||
    !Object.hasOwn(duplicateDecisionLabels, input.outcome) ||
    input.reason.length > 10000 ||
    (input.outcome !== "pending" && !input.reason)
  )
    throw new Error("Décision invalide. Choisissez une option et justifiez la décision.");
  return input;
}

export async function loadDuplicateWorkspace(
  db: Knex,
  { reviewedLocations = false } = {},
): Promise<DuplicateWorkspace> {
  const [projects, decisions, revisions] = await Promise.all([
    db<DuplicateReview>("onagre_duplicate_project")
      .select("project_id", "review_hash", "payload")
      .orderBy("project_id"),
    db<DuplicateDecision>("onagre_duplicate_decision").select("*"),
    db<DuplicateRevision>("onagre_duplicate_revision").select("*").orderBy("id", "desc"),
  ]);
  // Exports retain the raw payload bound to review_hash; only the UI requests corrected facts.
  if (!reviewedLocations) return { projects, decisions, revisions };
  const imported = await loadImportedDuplicateDemandes(
    db,
    projects.flatMap(({ payload }) => payload.demandes.map(({ key }) => key)),
  );
  const reviewed = projects.map(withReviewedLocations);
  for (const { payload } of reviewed)
    for (const demande of payload.demandes) {
      const id = importedDuplicateDossier(
        imported,
        payload.projectId,
        payload.sourceHash,
        demande.key,
      );
      if (id !== undefined) demande.importedDossierId = id;
    }
  return {
    projects: reviewed,
    decisions,
    revisions,
  };
}

export async function saveDuplicateDecision(
  trx: Knex.Transaction,
  actorId: number,
  input: DuplicateDecisionInput,
) {
  // Lock the project even on the first decision, when no decision row exists yet.
  const project = await trx<DuplicateReview>("onagre_duplicate_project")
    .where({ project_id: input.project_id })
    .forUpdate()
    .first();
  if (!project || project.review_hash !== input.review_hash)
    throw new MappingConflict("Cette revue a changé. Rechargez la page avant de décider.");
  const demande = project.payload.demandes.find((row) => row.key === input.demande_key);
  if (!demande || demande.linkedDossierId !== null)
    throw new MappingConflict(
      "Cette demande est absente de la revue ou possède déjà un lien confirmé.",
    );
  const imported = await loadImportedDuplicateDemandes(trx, [demande.key]);
  if (
    importedDuplicateDossier(
      imported,
      input.project_id,
      project.payload.sourceHash,
      demande.key,
    ) !== undefined
  )
    throw new MappingConflict("Cette demande a déjà été importée.");
  const before = await trx<DuplicateDecision>("onagre_duplicate_decision")
    .where({ demande_key: input.demande_key })
    .first();
  if ((before?.version ?? 0) !== input.version)
    throw new MappingConflict(
      "Une autre décision a été enregistrée. Rechargez la page pour la consulter.",
    );
  const values = {
    ...input,
    actor_id: actorId,
    version: input.version + 1,
    updated_at: trx.fn.now(),
  };
  const [after] = before
    ? await trx<DuplicateDecision>("onagre_duplicate_decision")
        .where({ demande_key: input.demande_key })
        .update(values)
        .returning("*")
    : await trx<DuplicateDecision>("onagre_duplicate_decision").insert(values).returning("*");
  await trx("onagre_duplicate_revision").insert({
    demande_key: input.demande_key,
    actor_id: actorId,
    before: before ?? null,
    after,
  });
  return after;
}
