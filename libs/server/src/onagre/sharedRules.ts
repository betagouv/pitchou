import type { Knex } from "knex";
import type { OnagreSharedRule } from "@pitchou/types/onagre.ts";
import { MappingConflict } from "./mappings.ts";

export function parseSharedRule(form: FormData) {
  const get = (key: string) => String(form.get(key) ?? "").trim();
  const key = get("key"),
    version = Number(get("version"));
  const rule = get("rule"),
    notes = get("notes");
  const status = get("status") as OnagreSharedRule["status"];
  if (
    !key ||
    !Number.isSafeInteger(version) ||
    version < 1 ||
    !["review", "discuss", "validated"].includes(status) ||
    rule.length > 20000 ||
    notes.length > 20000
  )
    throw new Error("Règle commune invalide.");
  if (!rule) throw new Error("Précisez la règle commune avant d'enregistrer.");
  return { key, version, rule, notes, status };
}

export async function saveSharedRule(
  trx: Knex.Transaction,
  actorId: number,
  decision: ReturnType<typeof parseSharedRule>,
) {
  const before = await trx<OnagreSharedRule>("onagre_shared_rule")
    .where({ key: decision.key })
    .forUpdate()
    .first();
  if (!before || before.version !== decision.version)
    throw new MappingConflict(
      "Cette règle commune a changé. Rechargez la page avant de reprendre votre modification.",
    );
  const [after] = await trx("onagre_shared_rule")
    .where({ key: decision.key })
    .update({
      ...decision,
      version: decision.version + 1,
      updated_at: trx.fn.now(),
    })
    .returning("*");
  await trx("onagre_shared_rule_revision").insert({
    rule_key: decision.key,
    actor_id: actorId,
    before,
    after,
  });
}
