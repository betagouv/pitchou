import type { Knex } from "knex";
import {
  commentOutcomes,
  type CommentDecisionInput,
  type CommentDecision,
  type CommentGroup,
} from "@pitchou/types/onagreComments.ts";
import { MappingConflict } from "../mappings.ts";

export function parseCommentDecision(form: FormData): CommentDecisionInput {
  const get = (key: string) => String(form.get(key) ?? "").trim();
  const input = {
    group_id: get("group_id"),
    review_hash: get("review_hash"),
    version: Number(get("version")),
    outcome: get("outcome"),
    target: get("target") || null,
    classification: get("classification") || null,
    code: get("code") || null,
    reason: get("reason"),
  } as CommentDecisionInput;
  if (
    !/^[a-f0-9]{16}$/u.test(input.group_id) ||
    !/^[a-f0-9]{64}$/u.test(input.review_hash) ||
    !get("version") ||
    !Number.isSafeInteger(input.version) ||
    input.version < 0 ||
    !Object.hasOwn(commentOutcomes, input.outcome) ||
    input.reason.length > 10000 ||
    (input.outcome !== "pending" && !input.reason)
  )
    throw new Error("Vérifiez la proposition et précisez son sens et ses limites.");
  if (input.outcome === "proposed") {
    if (
      !input.target ||
      !["impact_type", "impact_methode", "impact_moyen_de_poursuite"].includes(input.target) ||
      !["oiseau", "faune non-oiseau", "flore"].includes(input.classification ?? "") ||
      !input.code ||
      input.code.length > 50
    )
      throw new Error("Choisissez une destination complète dans le référentiel Pitchou.");
  } else {
    input.target = null;
    input.classification = null;
    input.code = null;
  }
  return input;
}

export async function saveCommentDecision(
  trx: Knex.Transaction,
  actorId: number,
  input: CommentDecisionInput,
) {
  const group = await trx<CommentGroup>("onagre_comment_group")
    .where({ id: input.group_id })
    .forUpdate()
    .first();
  if (!group || group.review_hash !== input.review_hash)
    throw new MappingConflict(
      "Ce groupe a changé. Rechargez la page avant de proposer une correspondance.",
    );
  if (input.outcome === "proposed") {
    if (group.category === "unresolved_species")
      throw new Error("Une espèce non résolue nécessite une revue du référentiel des espèces.");
    const classifications = group.payload.context.classifications ?? [];
    if (classifications.length > 0 && !classifications.includes(input.classification!))
      throw new Error("Cette classification ne correspond pas aux espèces du groupe.");
    const column = input.target === "impact_type" ? "identifiant_pitchou" : "code";
    const choice = await trx(input.target!)
      .where({ [column]: input.code, classification: input.classification })
      .first();
    if (!choice) throw new Error("Cette valeur n'existe plus dans le référentiel Pitchou.");
  }
  const before = await trx<CommentDecision>("onagre_comment_decision")
    .where({ group_id: input.group_id })
    .first();
  if ((before?.version ?? 0) !== input.version)
    throw new MappingConflict("Une autre proposition a été enregistrée. Rechargez la page.");
  const values = {
    ...input,
    actor_id: actorId,
    version: input.version + 1,
    updated_at: trx.fn.now(),
  };
  const [after] = before
    ? await trx("onagre_comment_decision")
        .where({ group_id: input.group_id })
        .update(values)
        .returning("*")
    : await trx("onagre_comment_decision").insert(values).returning("*");
  await trx("onagre_comment_revision").insert({
    group_id: input.group_id,
    actor_id: actorId,
    before: before ?? null,
    after,
  });
  return after;
}
