export const columns = {
  dossier: [
    "source",
    "onagre_demande_identifier",
    "name",
    "depot_date",
    "ddep_depot_date",
    "main_activite",
    "description",
    "primary_department",
    "no_other_satisfactory_solution_justification",
    "motif_derogation",
  ],
  decision_administrative: ["number", "type", "signature_date", "obligations_end_date"],
  prescription: ["due_date", "article_number", "description"],
  avis_expert: ["expert", "saisine_date", "avis", "avis_date"],
  commentaire: ["content"],
  evenement_phase_dossier: ["phase", "timestamp"],
};
export function validateFields(table, values) {
  if (
    !Object.hasOwn(columns, table) ||
    !values ||
    Array.isArray(values) ||
    typeof values !== "object"
  )
    throw new Error("Invalid record");
  for (const [key, value] of Object.entries(values)) {
    if (!columns[table].includes(key) || (value !== null && typeof value !== "string"))
      throw new Error(`Unsupported field ${table}.${key}`);
    if (
      key.endsWith("_date") &&
      value !== null &&
      (!/^\d{4}-\d{2}-\d{2}$/u.test(value) || new Date(value).toISOString().slice(0, 10) !== value)
    )
      throw new Error(`Invalid date ${key}`);
  }
}
export function validateSample(sample) {
  const identity = sample.identity;
  if (
    sample.formatVersion !== 1 ||
    identity?.sourceInstance !== "onagre-national" ||
    identity.sourceTable !== "demandes" ||
    !/^\d+$/u.test(identity.sourceId) ||
    identity.key !== `onagre-national:demandes:${identity.sourceId}`
  )
    throw new Error("Invalid source identity");
  validateFields("dossier", sample.proposal?.dossier);
  if (sample.proposal.dossier.source !== "onagre" || sample.proposal.dossier.depot_date !== null)
    throw new Error("Expected Onagre source and unknown creation date");
  const records = sample.proposal.records ?? [];
  if (!Array.isArray(records)) throw new Error("Expected records array");
  const known = new Map([[identity.key, "dossier"]]);
  for (const record of records) {
    if (
      record.table === "dossier" ||
      typeof record.sourceKey !== "string" ||
      !record.sourceKey.startsWith("onagre-national:") ||
      known.has(record.sourceKey)
    )
      throw new Error("Invalid or duplicate child identity");
    validateFields(record.table, record.values);
    if (
      record.table === "prescription" &&
      known.get(record.parentSourceKey) !== "decision_administrative"
    )
      throw new Error("Prescription requires an earlier decision");
    if (
      record.table === "evenement_phase_dossier" &&
      (!["Instruction", "Contrôle", "Classé sans suite", "Obligations terminées"].includes(
        record.values.phase,
      ) ||
        !/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/u.test(record.values.timestamp ?? "") ||
        new Date(record.values.timestamp).toISOString() !== record.values.timestamp)
    )
      throw new Error("Invalid historical phase");
    known.set(record.sourceKey, record.table);
  }
  return sample;
}
