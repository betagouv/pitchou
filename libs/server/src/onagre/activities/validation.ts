import type { Knex } from "knex";
import type { OnagreMapping } from "@pitchou/types/onagre.ts";
import { activityMapping } from "@pitchou/common/onagre/activities.ts";
import type { parseDecision } from "../validation.ts";
export async function validateActivityChoice(
  db: Knex,
  before: OnagreMapping,
  decision: ReturnType<typeof parseDecision>,
) {
  const code = decision.activity_code === undefined ? before.activity_code : decision.activity_code;
  if (code && !activityMapping(before))
    throw new Error("Cette correspondance ne concerne pas une activité.");
  if (!activityMapping(before)) return;
  if (decision.status === "excluded" && code)
    throw new Error("Retirez l'activité choisie pour exclure cette correspondance.");
  if (decision.status === "validated" && !code)
    throw new Error("Choisissez une activité Pitchou avant de valider.");
  if (code && !(await db("activite").where({ code }).first("code")))
    throw new Error("Cette activité n'existe plus. Actualisez la liste avant d'enregistrer.");
  if (code && decision.target !== "dossier.main_activite")
    throw new Error("Une activité choisie doit avoir pour destination dossier.main_activite.");
}
