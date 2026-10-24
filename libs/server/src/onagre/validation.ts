import type { OnagreBundle, MappingStatus, SourceRow } from "@pitchou/types/onagre.ts";

export function sourceId(value: unknown): number {
  if (
    typeof value !== "string" ||
    !/^[1-9]\d*$/u.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) > 2147483647
  )
    throw new Error("Identifiant Onagre invalide.");
  return Number(value);
}
function isRow(value: unknown): value is SourceRow {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.entries(value).every(
      ([key, cell]) =>
        /^[a-z_][a-z0-9_]*$/u.test(key) && (cell === null || typeof cell === "string"),
    )
  );
}
const seedFields = ["key", "section", "label", "context", "proposal", "confidence", "notes"];

export function parseBundle(value: unknown): OnagreBundle {
  const fail = () => {
    throw new Error("Paquet Onagre invalide. Utilisez le script de préparation du dépôt.");
  };
  if (!value || typeof value !== "object") return fail();
  const b = value as OnagreBundle;
  if (
    b.format !== "pitchou-onagre-v1" ||
    !/^[a-f0-9]{64}$/u.test(b.fingerprint) ||
    !/^[a-f0-9]{64}$/u.test(b.workbookFingerprint) ||
    typeof b.filename !== "string" ||
    b.filename.length > 255
  )
    return fail();
  if (
    !Array.isArray(b.tables) ||
    b.tables.length === 0 ||
    b.tables.length > 200 ||
    !Array.isArray(b.mappings) ||
    b.mappings.length > 5000 ||
    !Array.isArray(b.demandes) ||
    b.demandes.length > 100000 ||
    !Array.isArray(b.projets) ||
    b.projets.length > 100000
  )
    return fail();
  for (const table of b.tables) {
    if (
      !/^[a-z_]+$/u.test(table.name) ||
      !Number.isSafeInteger(table.count) ||
      table.count < 0 ||
      !Array.isArray(table.columns) ||
      !table.columns.every((c) => typeof c === "string" && /^[a-z_][a-z0-9_]*$/u.test(c)) ||
      !Array.isArray(table.samples) ||
      table.samples.length > 3 ||
      !table.samples.every(isRow)
    )
      return fail();
  }
  if (new Set(b.tables.map((t) => t.name)).size !== b.tables.length) return fail();
  for (const mapping of b.mappings) {
    if (!mapping || Object.keys(mapping).some((key) => !seedFields.includes(key))) return fail();
    if (
      !seedFields.every(
        (key) =>
          typeof mapping[key as keyof typeof mapping] === "string" &&
          mapping[key as keyof typeof mapping].length <= 20000,
      )
    )
      return fail();
    if (!mapping.key || !b.tables.some((t) => t.name === mapping.section)) return fail();
  }
  if (new Set(b.mappings.map((m) => m.key)).size !== b.mappings.length) return fail();
  const ids = new Set<number>();
  for (const row of b.projets) {
    if (!isRow(row)) return fail();
    const id = sourceId(row.projetid);
    if (ids.has(id)) return fail();
    ids.add(id);
  }
  const demandes = new Set<number>();
  for (const row of b.demandes) {
    if (!isRow(row)) return fail();
    const id = sourceId(row.demandesid);
    if (demandes.has(id) || !ids.has(sourceId(row.projetid))) return fail();
    demandes.add(id);
  }
  if (
    demandes.size === 0 ||
    b.tables.find((t) => t.name === "demandes")?.count !== demandes.size ||
    b.tables.find((t) => t.name === "projet")?.count !== ids.size
  )
    return fail();
  return b;
}

export function parseDecision(form: FormData) {
  const get = (key: string) => {
    const value = form.get(key);
    if (typeof value !== "string" || value.length > 20000)
      throw new Error("Champ absent ou trop long.");
    return value.trim();
  };
  const key = get("key"),
    status = get("status") as MappingStatus;
  const target = get("target"),
    rule = get("rule"),
    notes = get("notes");
  const version = Number(get("version"));
  if (
    !["todo", "review", "discuss", "validated", "excluded"].includes(status) ||
    !Number.isSafeInteger(version) ||
    version < 1
  )
    throw new Error("Décision invalide.");
  if (status === "validated" && (!target || !rule))
    throw new Error("Précisez la destination Pitchou et la règle avant de valider.");
  if (status === "excluded" && !rule)
    throw new Error("Expliquez pourquoi cette information est exclue.");
  return { key, version, status, target, rule, notes };
}
