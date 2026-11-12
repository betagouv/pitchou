export type ReconciliationSource = {
  projectId: string;
  projectCode?: string | null;
  name?: string | null;
  departments: string[];
  demandes: { id: string; code?: string | null }[];
};

export type ReconciliationTarget = {
  id: number;
  name?: string | null;
  onagre_demande_identifier?: string | null;
  departments?: unknown;
  primary_department?: string | null;
};

export type ReconciliationCandidate = {
  dossierId: number;
  reasons: (
    | "demande_reference"
    | "project_reference"
    | "same_name_and_department"
    | "similar_name_and_department"
  )[];
  demandeIds: string[];
  reference: string | null;
  name: string | null;
};

export function normalizeOnagreReference(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .replaceAll(/[‐‑‒–—−]/gu, "-")
    .replaceAll(/\s*-\s*/gu, "-")
    .trim()
    .toLowerCase();
}

/** Extract complete codes without accepting numeric prefixes of longer references. */
export function onagreReferences(value: string | null | undefined): Set<string> {
  const normalized = normalizeOnagreReference(value);
  return new Set([
    ...(normalized ? [normalized] : []),
    ...(normalized.match(/(?<![\p{L}\p{N}-])\d{4}(?:-[a-z0-9]+){2,5}(?![\p{L}\p{N}-])/gu) ?? []),
  ]);
}

const normalizeName = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, " ")
    .trim();
const stopWords = new Set(
  "de du des la le les un une et en a au aux sur pour par d l projet demande derogation travaux amenagement creation construction protection especes protegees".split(
    " ",
  ),
);
const words = (name: string) =>
  new Set(name.split(" ").filter((word) => word.length > 2 && !stopWords.has(word)));

/** Candidates require review; even a code can refer to a related or older demande. */
export function findOnagreCandidates(
  source: ReconciliationSource,
  targets: ReconciliationTarget[],
): ReconciliationCandidate[] {
  return createOnagreMatcher(targets)(source);
}

/** Index existing records once for a full-dump reconciliation. */
export function createOnagreMatcher(targets: ReconciliationTarget[]) {
  const references = new Map<string, Set<ReconciliationTarget>>();
  const departments = new Map<string, Set<ReconciliationTarget>>();
  const names = new Map<number, string>();
  function index(
    map: Map<string, Set<ReconciliationTarget>>,
    key: string,
    target: ReconciliationTarget,
  ) {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(target);
  }
  for (const target of targets) {
    for (const reference of onagreReferences(target.onagre_demande_identifier))
      index(references, reference, target);
    for (const department of [
      ...(Array.isArray(target.departments) ? target.departments : []),
      target.primary_department,
    ])
      if (typeof department === "string") index(departments, department, target);
    names.set(target.id, normalizeName(target.name));
  }
  return (source: ReconciliationSource): ReconciliationCandidate[] => {
    const projectCode = normalizeOnagreReference(source.projectCode);
    const name = normalizeName(source.name);
    const tokens = words(name);
    const candidates: ReconciliationCandidate[] = [];
    const possible = new Set<ReconciliationTarget>();
    for (const reference of [
      projectCode,
      ...source.demandes.map((d) => normalizeOnagreReference(d.code)),
    ])
      for (const target of references.get(reference) ?? []) possible.add(target);
    const sameDepartmentTargets = new Set<ReconciliationTarget>();
    for (const department of source.departments)
      for (const target of departments.get(department) ?? []) {
        possible.add(target);
        sameDepartmentTargets.add(target);
      }
    for (const target of possible) {
      const demandeIds = [
        ...new Set(
          source.demandes
            .filter((d) => d.code && references.get(normalizeOnagreReference(d.code))?.has(target))
            .map((d) => d.id),
        ),
      ];
      const reasons: ReconciliationCandidate["reasons"] = [];
      if (demandeIds.length > 0) reasons.push("demande_reference");
      if (projectCode && references.get(projectCode)?.has(target))
        reasons.push("project_reference");
      const sameDepartment = sameDepartmentTargets.has(target);
      const otherName = names.get(target.id)!;
      if (sameDepartment && name && name === otherName) reasons.push("same_name_and_department");
      else if (sameDepartment && tokens.size >= 3) {
        const other = words(otherName);
        const common = [...tokens].filter((word) => other.has(word)).length;
        if (common >= 3 && (2 * common) / (tokens.size + other.size) >= 0.75)
          reasons.push("similar_name_and_department");
      }
      if (reasons.length > 0)
        candidates.push({
          dossierId: target.id,
          reasons,
          demandeIds,
          reference: target.onagre_demande_identifier ?? null,
          name: target.name ?? null,
        });
    }
    return candidates.sort((a, b) => a.dossierId - b.dossierId);
  };
}
