import type { Knex } from "knex";
import type { OnagreMapping } from "@pitchou/types/onagre.ts";
import type { parseDecision } from "./validation.ts";

export class MappingConflict extends Error {}
export async function saveMapping(
  trx: Knex.Transaction,
  actorId: number,
  decision: ReturnType<typeof parseDecision>,
) {
  const before = await trx<OnagreMapping>("onagre_mapping")
    .where({ key: decision.key })
    .forUpdate()
    .first();
  if (!before || before.version !== decision.version)
    throw new MappingConflict(
      "Cette correspondance a changé. Rechargez la page avant de reprendre votre modification.",
    );
  const [after] = await trx("onagre_mapping")
    .where({ key: decision.key })
    .update({
      ...decision,
      version: decision.version + 1,
      updated_at: trx.fn.now(),
    })
    .returning("*");
  await trx("onagre_mapping_revision").insert({
    mapping_key: decision.key,
    actor_id: actorId,
    before,
    after,
  });
}
