import type { Knex } from "knex";
import type { ServiceDecision, OnagreServiceMapping } from "@pitchou/types/onagreServices.ts";
import { MappingConflict } from "../mappings.ts";
import { hash, positiveInteger, uuid } from "../import/policy.ts";
import { readGroups, serviceRows } from "./read.ts";

export function parseServiceDecision(form: FormData): ServiceDecision {
  const get = (key: string) => String(form.get(key) ?? "").trim();
  const snapshotId = positiveInteger(Number(get("snapshotId"))),
    serviceId = positiveInteger(Number(get("serviceId")));
  const version = Number(get("version")),
    status = get("status") as ServiceDecision["status"],
    notes = get("notes");
  const groupIds = [...new Set(form.getAll("groupIds").map((value) => uuid(String(value))))].sort();
  if (
    !Number.isSafeInteger(version) ||
    version < 0 ||
    !["todo", "review", "discuss", "validated", "excluded"].includes(status) ||
    notes.length > 10000 ||
    groupIds.length > 100
  )
    throw new Error("Correspondance de service invalide.");
  if (status === "validated" && groupIds.length === 0)
    throw new Error("Choisissez au moins un groupe avant de valider.");
  if (status === "excluded" && groupIds.length > 0)
    throw new Error("Une exclusion ne doit pas contenir de groupe cible.");
  if (status === "excluded" && !notes) throw new Error("Précisez la raison de l'exclusion.");
  return {
    snapshotId,
    serviceId,
    version,
    status,
    notes,
    groupIds,
    sourceHash: get("sourceHash"),
    catalogHash: get("catalogHash"),
  };
}
export async function saveServiceMapping(
  trx: Knex.Transaction,
  actorId: number,
  decision: ServiceDecision,
) {
  // Serialize initial inserts as well as edits, and hold the catalogue stable during validation.
  await trx.raw("select pg_advisory_xact_lock(01112026)");
  const groups = await readGroups(trx);
  if (hash(groups) !== decision.catalogHash)
    throw new MappingConflict(
      "La liste des groupes a changé. Actualisez la page avant d'enregistrer.",
    );
  const source = (await serviceRows(trx, decision.snapshotId, "services")).find(
    (row) => Number(row.servicesid) === decision.serviceId,
  );
  if (!source || hash(source) !== decision.sourceHash)
    throw new MappingConflict(
      "Le service source a changé ou est absent de ce dump. Actualisez la page.",
    );
  const key = { source_instance: "onagre-national", service_id: decision.serviceId };
  const before = await trx<OnagreServiceMapping>("onagre_service_mapping")
    .where(key)
    .forUpdate()
    .first();
  if ((before?.version ?? 0) !== decision.version)
    throw new MappingConflict(
      "Cette correspondance a été modifiée par un autre membre de l'équipe. Actualisez avant de reprendre votre modification.",
    );
  const selected = decision.groupIds.map((id) => groups.find((group) => group.id === id));
  if (selected.some((group) => !group?.active))
    throw new Error("Un groupe choisi est absent ou inactif. Choisissez des groupes actifs.");
  const values = {
    ...key,
    snapshot_id: decision.snapshotId,
    source: JSON.stringify(source),
    source_hash: decision.sourceHash,
    group_ids: JSON.stringify(decision.groupIds),
    status: decision.status,
    notes: decision.notes,
    version: decision.version + 1,
    updated_at: trx.fn.now(),
  };
  const [after] = before
    ? await trx("onagre_service_mapping").where(key).update(values).returning("*")
    : await trx("onagre_service_mapping").insert(values).returning("*");
  await trx("onagre_service_mapping_revision").insert({
    ...key,
    actor_id: actorId,
    before: before ? JSON.stringify(before) : null,
    after: JSON.stringify(after),
    groups: JSON.stringify(selected),
  });
  return after as OnagreServiceMapping;
}
