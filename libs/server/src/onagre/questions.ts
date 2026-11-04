import type { Knex } from "knex";
import { randomUUID } from "node:crypto";
import { MappingConflict } from "./mappings.ts";
import {
  questionStatusLabels,
  type OnagreQuestion,
  type OnagreQuestionInput,
  type OnagreQuestionStatus,
} from "@pitchou/types/onagreQuestions.ts";

export function parseQuestion(form: FormData): OnagreQuestionInput {
  const get = (key: string) => String(form.get(key) ?? "").trim();
  const id = get("id");
  const version = Number(get("version"));
  const status = get("status") as OnagreQuestionStatus;
  const title = get("title");
  const context = get("context"),
    examples = get("examples"),
    options = get("options"),
    answer = get("answer");
  if (
    (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(id)) ||
    !Number.isSafeInteger(version) ||
    version < 0 ||
    (id ? version < 1 : version !== 0) ||
    !Object.hasOwn(questionStatusLabels, status) ||
    !title ||
    title.length > 200 ||
    [context, examples, options, answer].some((value) => value.length > 20000)
  )
    throw new Error("Question invalide. Vérifiez le titre et les champs saisis.");
  if (status === "answered" && !answer)
    throw new Error("Renseignez la réponse de l’équipe avant de marquer la décision comme prise.");
  return { id, version, status, title, context, examples, options, answer };
}

export function loadQuestions(db: Knex) {
  return db<OnagreQuestion>("onagre_question")
    .select("*")
    .orderBy("created_at", "desc")
    .orderBy("id");
}

export async function saveQuestion(
  trx: Knex.Transaction,
  actorId: number,
  input: OnagreQuestionInput,
) {
  const { id, version, ...values } = input;
  const before = id
    ? await trx<OnagreQuestion>("onagre_question").where({ id }).forUpdate().first()
    : undefined;
  if (id && (!before || before.version !== version))
    throw new MappingConflict(
      "Cette question a changé. Rechargez la page avant de reprendre votre modification.",
    );
  const [after] = before
    ? await trx<OnagreQuestion>("onagre_question")
        .where({ id })
        .update({ ...values, version: version + 1, updated_at: trx.fn.now() })
        .returning("*")
    : await trx<OnagreQuestion>("onagre_question")
        .insert({ ...values, id: randomUUID(), version: 1 })
        .returning("*");
  await trx("onagre_question_revision").insert({
    question_id: after.id,
    actor_id: actorId,
    before: before ?? null,
    after,
  });
  return after;
}
