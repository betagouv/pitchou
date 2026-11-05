import { validateSpecies } from "./species.mjs";
import { validateActors } from "./actors.mjs";
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
    "communes",
    "departments",
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
    const location = table === "dossier" && ["communes", "departments"].includes(key);
    if (!columns[table].includes(key) || (value !== null && !location && typeof value !== "string"))
      throw new Error(`Unsupported field ${table}.${key}`);
    if (location && value !== null) {
      const valid =
        Array.isArray(value) &&
        value.every((item) =>
          key === "departments"
            ? typeof item === "string" && /^(?:\d{2,3}|2[AB])$/u.test(item)
            : item &&
              typeof item === "object" &&
              !Array.isArray(item) &&
              Object.keys(item).every((field) => ["name", "code", "postalCode"].includes(field)) &&
              typeof item.name === "string" &&
              item.name.trim().length > 0 &&
              typeof item.code === "string" &&
              /^[0-9AB]{5}$/u.test(item.code) &&
              typeof item.postalCode === "string" &&
              /^\d{5}$/u.test(item.postalCode),
        );
      if (!valid) throw new Error(`Invalid location ${key}`);
    }
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
  const initial = identity?.sourceTable === "projet";
  if (
    sample.formatVersion !== 1 ||
    identity?.sourceInstance !== "onagre-national" ||
    !["demandes", "projet"].includes(identity.sourceTable) ||
    typeof identity.sourceId !== "string" ||
    !/^\d+$/u.test(identity.sourceId) ||
    identity.key !==
      (initial
        ? `onagre-national:projet:${identity.sourceId}:initial-demande`
        : `onagre-national:demandes:${identity.sourceId}`)
  )
    throw new Error("Invalid source identity");
  validateFields("dossier", sample.proposal?.dossier);
  validateActors(sample.proposal);
  if (sample.proposal.dossier.source !== "onagre" || sample.proposal.dossier.depot_date !== null)
    throw new Error("Expected Onagre source and unknown creation date");
  if (initial) validateInitialDemande(sample);
  const records = sample.proposal.records ?? [];
  if (sample.proposal.speciesImpacts !== undefined) validateSpecies(sample.proposal.speciesImpacts);
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
        (record.values.timestamp !== null &&
          (!/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/u.test(record.values.timestamp ?? "") ||
            new Date(record.values.timestamp).toISOString() !== record.values.timestamp)))
    )
      throw new Error("Invalid historical phase");
    known.set(record.sourceKey, record.table);
  }
  for (const impact of sample.proposal.speciesImpacts ?? []) {
    if (known.has(impact.sourceKey)) throw new Error("Duplicate species identity");
    known.set(impact.sourceKey, "especes_impactees_par_dossier");
  }
  const actorKeys = [
    `${identity.key}:porteur`,
    `${identity.key}:porteur:person`,
    `${identity.key}:porteur:organisation`,
    ...(sample.proposal.contacts ?? []).flatMap(({ sourceKey }) => [
      `${sourceKey}:person`,
      `${sourceKey}:contact`,
    ]),
  ];
  for (const key of actorKeys) {
    if (known.has(key)) throw new Error("Duplicate actor identity");
    known.set(key, "actor");
  }
  return sample;
}

function validateInitialDemande(sample) {
  const identity = sample.identity;
  if (
    identity.projetId !== identity.sourceId ||
    !sample.label?.startsWith("Demande initiale — projet Onagre sans demande") ||
    sample.source?.rows?.demandes?.length !== 0 ||
    sample.source?.relatedDemandes?.length !== 0 ||
    sample.source?.rows?.projet?.length !== 1 ||
    sample.source.rows.projet[0].projetid !== identity.sourceId ||
    sample.proposal.dossier.onagre_demande_identifier !== "" ||
    sample.proposal.dossier.ddep_depot_date !== null ||
    (sample.proposal.records ?? []).some((record) => record.table !== "commentaire") ||
    (sample.proposal.speciesImpacts ?? []).length > 0
  )
    throw new Error(
      "Initial demande requires an explicit label and project-only provenance without invented demande data",
    );
}
