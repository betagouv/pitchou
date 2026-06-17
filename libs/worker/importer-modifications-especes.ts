import { readFile } from "node:fs/promises";

import { getODSTableRawContent, sheetRawContentToObjects, isRowNotEmpty } from "@odfjs/odfjs";

import { directDatabaseConnection, closeDatabaseConnection } from "@pitchou/server/database.ts";
import { upsertEspeceProtegeeModification } from "@pitchou/server/especeProtegee.ts";

import type { ESPÈCES_MINISTÉRIELLES_ROW, ESPÈCES_CNPN_ROW } from "@pitchou/types/especes.d.ts";

// ONE-OFF production bootstrap. Populates `espece_protegee_modification` from the two
// committed .ods files, matched against the already-built reference
// (`espece_protegee_reference` matview) + `espece_taxref`:
//   - ministérielle / CNPN flags → sparse patches on matching reference cd_refs;
//   - « espèces manquantes » → « Espèce manquante » additions (names from TAXREF).
// Upsert-only (never removes), so it's idempotent and preserves any other rows.
//
// Run once at deployment (`just generate-modifications-especes`), and in dev to check it
// reproduces what seeds 05/06 set up. AFTER deployment, this script AND the two .ods
// files are meant to be deleted — the manual layer then lives in the DB (edited via
// the admin UI). The seeds remain the permanent dev fixtures.

process.title = `Import modifications espèces`;

const MINISTERIELLES_CNPN_PATH = "data/sources_especes/espèces_ministérielles_cnpn.ods";
const MANQUANTES_PATH = "data/sources_especes/espèces_manquantes.ods";

type TaxrefRow = {
  id: string;
  cd_nom: string;
  cd_ref: string;
  lb_nom: string;
  nom_vern: string;
  regne: string;
  classe: string;
};

// strip leading/trailing spaces and non-breaking spaces, like JS .trim()
const btrim = (s: string) => s.replace(/^[\s ]+|[\s ]+$/g, "");

const accepteEnTete = (a: TaxrefRow, b: TaxrefRow) => {
  const aAcc = a.cd_nom === a.cd_ref ? 0 : 1;
  const bAcc = b.cd_nom === b.cd_ref ? 0 : 1;
  return aAcc - bAcc || Number(a.id) - Number(b.id);
};

function scientifiques(rows: TaxrefRow[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of [...rows].sort(accepteEnTete)) {
    if (r.lb_nom && !seen.has(r.lb_nom)) {
      seen.add(r.lb_nom);
      out.push(r.lb_nom);
    }
  }
  return out;
}

function vernaculaires(rows: TaxrefRow[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of [...rows].sort(accepteEnTete)) {
    if (!r.nom_vern) continue;
    for (const part of r.nom_vern.split(",")) {
      const v = btrim(part);
      if (v && !seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    }
  }
  return out;
}

function classification(rows: TaxrefRow[]): string {
  const accepte = rows.find((r) => r.cd_nom === r.cd_ref) ?? rows[0];
  const { regne, classe } = accepte;
  if (["Plantae", "Fungi", "Chromista"].includes(regne)) return "flore";
  if (regne === "Animalia" && classe === "Aves") return "oiseau";
  return "faune non-oiseau";
}

async function main() {
  const db = directDatabaseConnection;

  // --- ministérielle / CNPN .ods (names) ---
  const sheetMap = await readFile(MINISTERIELLES_CNPN_PATH).then(getODSTableRawContent);
  // Non-breaking spaces (U+00A0) creep in from copy-paste; normalize for exact matching.
  const normaliserNom = (s: string) => s.replace(/ /g, " ").trim();
  const normaliser = <T>(l: T[]): T[] =>
    l.map(
      (r) =>
        Object.fromEntries(
          Object.entries(r as Record<string, unknown>).map(([k, v]) => [
            k,
            typeof v === "string" ? normaliserNom(v) : v,
          ]),
        ) as T,
    );
  const ministerielles = normaliser(
    sheetRawContentToObjects<ESPÈCES_MINISTÉRIELLES_ROW>(
      sheetMap.get("Espèces Ministérielles")!.filter(isRowNotEmpty),
    ),
  );
  const cnpn = normaliser(
    sheetRawContentToObjects<ESPÈCES_CNPN_ROW>(sheetMap.get("Espèces CNPN")!.filter(isRowNotEmpty)),
  );
  const nomsMinisterielles = new Set([
    ...ministerielles.map((m) => m["Nom scientifique"]),
    ...ministerielles.map((m) => m["Nom vernaculaire"]),
  ]);
  const nomsCnpn = new Set([
    ...cnpn.map((c) => c["Nom scientifique"]),
    ...cnpn.map((c) => c["Nom vernaculaire"]),
  ]);

  // --- match against the reference (matview) ---
  const referenceRows: {
    cd_ref: string;
    noms_scientifiques: string[];
    noms_vernaculaires: string[];
  }[] = await db("espece_protegee_reference").select(
    "cd_ref",
    "noms_scientifiques",
    "noms_vernaculaires",
  );

  let nbMin = 0;
  let nbCnpn = 0;
  for (const espece of referenceRows) {
    const noms = [...espece.noms_scientifiques, ...espece.noms_vernaculaires];
    const estMin = noms.some((n) => nomsMinisterielles.has(n));
    const estCnpn = noms.some((n) => nomsCnpn.has(n));
    if (!estMin && !estCnpn) continue;
    const patch: { espece_ministerielle?: true; espece_cnpn?: true } = {};
    if (estMin) {
      patch.espece_ministerielle = true;
      nbMin++;
    }
    if (estCnpn) {
      patch.espece_cnpn = true;
      nbCnpn++;
    }
    await upsertEspeceProtegeeModification(espece.cd_ref, patch, db);
  }

  // --- « espèces manquantes » → additions ---
  const manqMap = await readFile(MANQUANTES_PATH).then(getODSTableRawContent);
  const manquantesCdRefs = sheetRawContentToObjects<{ CD_NOM: number | string }>(
    manqMap.get("espèces_manquantes")!.filter(isRowNotEmpty),
  ).map((r) => r.CD_NOM.toString(10));

  const taxrefRows: TaxrefRow[] = await db("espece_taxref")
    .select("id", "cd_nom", "cd_ref", "lb_nom", "nom_vern", "regne", "classe")
    .whereIn("cd_ref", manquantesCdRefs)
    .orderBy("id");
  const taxrefByCdRef = new Map<string, TaxrefRow[]>();
  for (const r of taxrefRows) {
    if (!taxrefByCdRef.has(r.cd_ref)) taxrefByCdRef.set(r.cd_ref, []);
    taxrefByCdRef.get(r.cd_ref)!.push(r);
  }

  let nbAjouts = 0;
  const introuvables: string[] = [];
  for (const cd_ref of manquantesCdRefs) {
    const rows = taxrefByCdRef.get(cd_ref);
    if (!rows || rows.length === 0) {
      introuvables.push(cd_ref);
      continue;
    }
    const noms_scientifiques = scientifiques(rows);
    const noms_vernaculaires = vernaculaires(rows);
    // An addition can itself be a ministérielle / CNPN species. The old generator
    // merged the « manquantes » into the protected set BEFORE the flag matching, so
    // those flags landed on additions too — reproduce that here (the reference-only
    // loop above never sees additions).
    const noms = [...noms_scientifiques, ...noms_vernaculaires];
    const estMin = noms.some((n) => nomsMinisterielles.has(n));
    const estCnpn = noms.some((n) => nomsCnpn.has(n));
    await upsertEspeceProtegeeModification(
      cd_ref,
      {
        classification: classification(rows),
        noms_scientifiques,
        noms_vernaculaires,
        cd_type_statuts: ["Espèce manquante"],
        ...(estMin ? { espece_ministerielle: true } : {}),
        ...(estCnpn ? { espece_cnpn: true } : {}),
      },
      db,
    );
    if (estMin) nbMin++;
    if (estCnpn) nbCnpn++;
    nbAjouts++;
  }

  console.info(`Drapeaux ministérielle: ${nbMin}, CNPN: ${nbCnpn}`);
  console.info(`Ajouts « Espèce manquante »: ${nbAjouts}`);
  if (introuvables.length) {
    console.warn(`⚠️  Manquantes introuvables dans espece_taxref: ${introuvables.join(", ")}`);
  }
}

main().finally(() => closeDatabaseConnection());
