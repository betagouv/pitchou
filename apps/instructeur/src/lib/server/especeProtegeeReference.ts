import type { Knex } from "knex";

// Relative imports (not the `$` aliases) so this module also resolves under `tsx`,
// which runs the import scripts and the seeds.
import { directDatabaseConnection } from "../../../scripts/server/database.ts";

import type { EspeceProtegeeReferenceInitializer } from "../../../scripts/types/database/public/EspeceProtegeeReference.ts";

// `espece_protegee_reference` is a plain table derived from the source tables.
// `rebuildEspeceProtegeeReference` replaces it from `espece_taxref` +
// `espece_bdc_statut`, reproducing the historical generator: one row per protected
// CD_REF, names aggregated with the accepted taxon first, then synonyms in import
// order. The manual layer (`espece_protegee_modification`) is never touched.

const KEPT_STATUTS = ["PN", "PR", "PD", "POM"];

/** A TAXREF row, reduced to what the reference aggregation needs. */
export type TaxrefNameRow = {
  cd_ref: string;
  cd_nom: string;
  lb_nom: string;
  nom_vern: string;
  regne: string;
  classe: string;
};

/**
 * Rebuilds `espece_protegee_reference` from `espece_taxref` + `espece_bdc_statut`. Run
 * after importing those sources (`just generate-especes-protegees`). Replaces the whole
 * table atomically; never touches `espece_protegee_modification`, so the manual layer
 * survives a rebuild.
 */
export async function rebuildEspeceProtegeeReference(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  const statutsByCdRef = await loadStatutsByCdRef(databaseConnection);
  const taxrefRows = await loadProtectedTaxrefRows(databaseConnection);
  const rows = aggregateEspeceProtegeeReference(taxrefRows, statutsByCdRef);

  await databaseConnection.transaction(async (trx) => {
    await trx("espece_protegee_reference").truncate();
    if (rows.length >= 1) await trx.batchInsert("espece_protegee_reference", rows, 1000);
  });
}

/** The kept statuts carried by each protected CD_REF. */
async function loadStatutsByCdRef(
  databaseConnection: Knex.Transaction | Knex,
): Promise<Map<string, Set<string>>> {
  const rows = await databaseConnection("espece_bdc_statut")
    .select("cd_ref", "cd_type_statut")
    .whereIn("cd_type_statut", KEPT_STATUTS);
  const byCdRef = new Map<string, Set<string>>();
  for (const { cd_ref, cd_type_statut } of rows) {
    const set = byCdRef.get(cd_ref) ?? byCdRef.set(cd_ref, new Set()).get(cd_ref)!;
    set.add(cd_type_statut);
  }
  return byCdRef;
}

/** TAXREF rows for protected species only, in import order (stable synonym order). */
function loadProtectedTaxrefRows(
  databaseConnection: Knex.Transaction | Knex,
): Promise<TaxrefNameRow[]> {
  return databaseConnection("espece_taxref as t")
    .join(
      databaseConnection("espece_bdc_statut")
        .distinct("cd_ref")
        .whereIn("cd_type_statut", KEPT_STATUTS)
        .as("p"),
      "p.cd_ref",
      "t.cd_ref",
    )
    .select("t.cd_ref", "t.cd_nom", "t.lb_nom", "t.nom_vern", "t.regne", "t.classe")
    .orderBy("t.id");
}

/**
 * Pure aggregation: from TAXREF rows (ordered by import id) and the kept statuts per
 * CD_REF, produces the reference rows. Exported for unit testing.
 */
export function aggregateEspeceProtegeeReference(
  taxrefRows: TaxrefNameRow[],
  statutsByCdRef: Map<string, Set<string>>,
): EspeceProtegeeReferenceInitializer[] {
  const species = new Map<string, SpeciesAccumulator>();
  taxrefRows.forEach((row, order) => accumulateTaxrefRow(species, row, order));

  const rows: EspeceProtegeeReferenceInitializer[] = [];
  for (const [cd_ref, acc] of species) {
    const row = buildReferenceRow(cd_ref, acc, statutsByCdRef.get(cd_ref));
    if (row) rows.push(row);
  }
  return rows;
}

type SpeciesAccumulator = {
  regne: string;
  classe: string;
  classificationFromAccepted: boolean; // are regne/classe already from the accepted taxon?
  scientificNames: Map<string, NameRank>;
  vernacularNames: Map<string, NameRank>;
};

/** Folds one TAXREF row (at the given import order) into the per-CD_REF accumulator. */
function accumulateTaxrefRow(
  species: Map<string, SpeciesAccumulator>,
  row: TaxrefNameRow,
  order: number,
): void {
  const accepted = row.cd_nom === row.cd_ref;
  let acc = species.get(row.cd_ref);
  if (!acc) {
    acc = {
      regne: row.regne,
      classe: row.classe,
      classificationFromAccepted: false,
      scientificNames: new Map(),
      vernacularNames: new Map(),
    };
    species.set(row.cd_ref, acc);
  }
  // classification comes from the accepted taxon; the first row seen is the fallback.
  if (accepted && !acc.classificationFromAccepted) {
    acc.regne = row.regne;
    acc.classe = row.classe;
    acc.classificationFromAccepted = true;
  }
  if (row.lb_nom) addName(acc.scientificNames, row.lb_nom, { accepted, order, pos: 0 });
  row.nom_vern.split(",").forEach((part, pos) => {
    const name = part.trim(); // JS .trim() strips end spaces incl. U+00A0, as the old generator did
    if (name) addName(acc!.vernacularNames, name, { accepted, order, pos });
  });
}

/** Sort key of a name: accepted taxon first, then import order, then position in NOM_VERN. */
type NameRank = { accepted: boolean; order: number; pos: number };

/** Records a name occurrence, keeping the earliest rank and OR-ing the accepted flag. */
function addName(names: Map<string, NameRank>, name: string, rank: NameRank): void {
  const existing = names.get(name);
  if (!existing) {
    names.set(name, rank);
    return;
  }
  existing.accepted ||= rank.accepted;
  if (rank.order < existing.order) existing.order = rank.order;
  if (rank.pos < existing.pos) existing.pos = rank.pos;
}

/** Turns one accumulated species into a reference row, or null if it must be dropped. */
function buildReferenceRow(
  cd_ref: string,
  acc: SpeciesAccumulator,
  statuts: Set<string> | undefined,
): EspeceProtegeeReferenceInitializer | null {
  const classification = classificationFromTaxref(acc.regne, acc.classe);
  const noms_scientifiques = sortNames(acc.scientificNames);
  const noms_vernaculaires = sortNames(acc.vernacularNames);
  // Keep only species with a classification AND at least one name.
  if (!classification || (noms_scientifiques.length === 0 && noms_vernaculaires.length === 0))
    return null;
  return {
    cd_ref,
    classification,
    noms_scientifiques,
    noms_vernaculaires,
    cd_type_statuts: KEPT_STATUTS.filter((statut) => statuts?.has(statut)),
  } as EspeceProtegeeReferenceInitializer;
}

/** REGNE/CLASSE → classification, or null for a taxon we don't keep. */
function classificationFromTaxref(regne: string, classe: string): string | null {
  if (["Plantae", "Fungi", "Chromista"].includes(regne)) return "flore";
  if (regne === "Animalia" && classe === "Aves") return "oiseau";
  if (regne === "Animalia") return "faune non-oiseau";
  return null;
}

/** Names sorted accepted-first, then import order, then position. */
function sortNames(names: Map<string, NameRank>): string[] {
  return [...names.entries()]
    .sort(
      ([, a], [, b]) =>
        Number(b.accepted) - Number(a.accepted) || a.order - b.order || a.pos - b.pos,
    )
    .map(([name]) => name);
}
