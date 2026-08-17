import { createOdsFile } from "@odfjs/odfjs";
import * as XLSX from "xlsx";

import type {
  ActiviteMenancante,
  EspeceProtegee,
  MethodeMenancante,
  MoyenDePoursuiteMenacant,
} from "@pitchou/types/especes.d.ts";
import type { ActivitesMethodesMoyensDePoursuiteBundle } from "@pitchou/types/pitchouState.ts";

// A pétitionnaire fills the file by hand, months before we read it, against a référentiel that
// keeps moving. These fixtures give the tests a référentiel small enough to reason about: one type
// d impact that accepts a nombre d individus and a méthode, and nothing else.

export const OISEAU: EspeceProtegee = {
  CD_REF: "2437",
  classification: "oiseau",
} as EspeceProtegee;
export const FLEUR = { CD_REF: "99999", classification: "flore" } as EspeceProtegee;

export const especeByCD_REF = new Map([
  [OISEAU.CD_REF, OISEAU],
  [FLEUR.CD_REF, FLEUR],
]);

/** Accepts a nombre d'individus and a méthode, nothing else. */
export const CAPTURE: ActiviteMenancante = {
  "Code rapportage européen": "2",
  "Identifiant Pitchou": "P-2-1",
  "Libellé activité directive européenne": "Capture délibérée",
  "Libellé Pitchou": "Capture pour captivité temporaire ou définitive",
  Méthode: "Oui",
  "Moyen de poursuite": "Non",
  "Nombre d'individus": "Oui",
  Nids: "Non",
  Œufs: "Non",
  "Surface habitat détruit (m²)": "Non",
};

export const METHODE_SELECTIVE: MethodeMenancante = {
  Code: "0",
  Espèces: "oiseau",
  "Libellé activité directive européenne": "non concerné",
  "Libellé Pitchou": "Par une méthode sélective, non massive",
};

export const referentiel: ActivitesMethodesMoyensDePoursuiteBundle = {
  activités: {
    oiseau: new Map([["P-2-1", CAPTURE]]),
    "faune non-oiseau": new Map(),
    flore: new Map(),
  },
  méthodes: {
    oiseau: new Map([["0", METHODE_SELECTIVE]]),
    "faune non-oiseau": new Map(),
    flore: new Map(),
  },
  moyensDePoursuite: {
    oiseau: new Map<string, MoyenDePoursuiteMenacant>(),
    "faune non-oiseau": new Map(),
    flore: new Map(),
  },
  identifiantPitchouVersActivitéEtImpactsQuantifiés: new Map(),
};

export type Cellule = string | number;

export function feuilleOiseau(headers: string[], rows: Cellule[][]) {
  return new Map([
    [
      "oiseau",
      [headers, ...rows].map((row) =>
        row.map((value) =>
          typeof value === "number"
            ? { value, type: "float" as const }
            : { value, type: "string" as const },
        ),
      ),
    ],
  ]);
}

export const ods = (headers: string[], rows: Cellule[][]) =>
  createOdsFile(feuilleOiseau(headers, rows));

export function xlsx(headers: string[], rows: Cellule[][]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, ...rows]), "oiseau");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
