import { describe, it, expect } from "vitest";
import { createOdsFile } from "@odfjs/odfjs";
import * as XLSX from "xlsx";

import { parseFichierEspecesImpactees } from "./parseFichierEspecesImpactees.ts";
import { importDescriptionMenacesEspecesFromOdsArrayBuffer } from "../especesUtils.ts";

import type {
  ActiviteMenancante,
  EspeceProtegee,
  MethodeMenancante,
  MoyenDePoursuiteMenacant,
} from "@pitchou/types/especes.d.ts";
import type { ActivitesMethodesMoyensDePoursuiteBundle } from "@pitchou/types/pitchouState.ts";

const OISEAU: EspeceProtegee = { CD_REF: "2437", classification: "oiseau" } as EspeceProtegee;
const FLEUR = { CD_REF: "99999", classification: "flore" } as EspeceProtegee;

const especeByCD_REF = new Map([
  [OISEAU.CD_REF, OISEAU],
  [FLEUR.CD_REF, FLEUR],
]);

/** Accepts a nombre d'individus and a méthode, nothing else. */
const CAPTURE: ActiviteMenancante = {
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

const METHODE_SELECTIVE: MethodeMenancante = {
  Code: "0",
  Espèces: "oiseau",
  "Libellé activité directive européenne": "non concerné",
  "Libellé Pitchou": "Par une méthode sélective, non massive",
};

const referentiel: ActivitesMethodesMoyensDePoursuiteBundle = {
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

type Cellule = string | number;

function feuilleOiseau(headers: string[], rows: Cellule[][]) {
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

const ods = (headers: string[], rows: Cellule[][]) => createOdsFile(feuilleOiseau(headers, rows));

function xlsx(headers: string[], rows: Cellule[][]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, ...rows]), "oiseau");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

const parse = (fichier: ArrayBuffer) =>
  parseFichierEspecesImpactees(fichier, especeByCD_REF, referentiel);

describe("parseFichierEspecesImpactees", () => {
  const HEADERS = ["CD_REF", "nombre individus", "identifiant pitchou activité"];

  it("reads a well-formed file without anomalie", async () => {
    const { impactEspece, anomalies } = await parse(
      await ods(HEADERS, [["2437", "11-100", "P-2-1"]]),
    );

    expect(anomalies).toEqual([]);
    expect(impactEspece.oiseau).toHaveLength(1);
    expect(impactEspece.oiseau[0].espèce).toBe(OISEAU);
    expect(impactEspece.oiseau[0].activité).toBe(CAPTURE);
    expect(impactEspece.oiseau[0].nombreIndividus).toBe("11-100");
  });

  it("keeps the other lines when one espèce is unknown", async () => {
    const { impactEspece, anomalies } = await parse(
      await ods(HEADERS, [
        ["404404", "1-10", "P-2-1"],
        ["2437", "11-100", "P-2-1"],
      ]),
    );

    expect(impactEspece.oiseau).toHaveLength(1);
    expect(impactEspece.oiseau[0].espèce).toBe(OISEAU);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]).toMatchObject({ classification: "oiseau", ligne: 2 });
    expect(anomalies[0].message).toContain("404404");
  });

  it("drops a line whose type d'impact is unknown", async () => {
    const { impactEspece, anomalies } = await parse(await ods(HEADERS, [["2437", "1-10", "P-99"]]));

    expect(impactEspece.oiseau).toHaveLength(0);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].message).toContain("P-99");
  });

  it("drops a line whose méthode code is unknown", async () => {
    const { impactEspece, anomalies } = await parse(
      await ods([...HEADERS, "code méthode"], [["2437", "1-10", "P-2-1", "42"]]),
    );

    expect(impactEspece.oiseau).toHaveLength(0);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].message).toContain("42");
  });

  it("drops a line whose espèce belongs to another classification", async () => {
    const { impactEspece, anomalies } = await parse(
      await ods(HEADERS, [["99999", "1-10", "P-2-1"]]),
    );

    expect(impactEspece.oiseau).toHaveLength(0);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].message).toContain("flore");
  });

  it("drops a criterion the type d'impact does not accept, and keeps the line", async () => {
    const { impactEspece, anomalies } = await parse(
      await ods([...HEADERS, "nids"], [["2437", "1-10", "P-2-1", 3]]),
    );

    expect(impactEspece.oiseau).toHaveLength(1);
    expect(impactEspece.oiseau[0].nombreNids).toBeUndefined();
    expect(impactEspece.oiseau[0].nombreIndividus).toBe("1-10");
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].message).toContain("nids");
  });

  it("reports an unreadable file as a single anomalie", async () => {
    const { impactEspece, anomalies } = await parse(
      new TextEncoder().encode("pas un tableur").buffer,
    );

    expect(impactEspece.oiseau).toHaveLength(0);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].ligne).toBeUndefined();
  });

  it("guesses the type d'impact of a file predating the identifiant Pitchou column", async () => {
    // Version 1.1.0 added « identifiant pitchou activité ». Older files only carry the European
    // code, and code 2 means P-2-1.
    const { impactEspece, anomalies } = await parse(
      await ods(["CD_REF", "nombre individus", "code activité"], [["2437", "1-10", "2"]]),
    );

    expect(anomalies).toEqual([]);
    expect(impactEspece.oiseau[0].activité).toBe(CAPTURE);
  });

  it("reads an .xlsx exactly like the equivalent .ods", async () => {
    const rows: Cellule[][] = [[2437, "11-100", "P-2-1"]];

    const fromOds = await parse(await ods(HEADERS, rows));
    const fromXlsx = await parse(xlsx(HEADERS, rows));

    expect(fromXlsx).toEqual(fromOds);
    expect(fromXlsx.anomalies).toEqual([]);
  });
});

describe("importDescriptionMenacesEspecesFromOdsArrayBuffer", () => {
  it("still throws on the first anomalie", async () => {
    const fichier = await ods(["CD_REF", "identifiant pitchou activité"], [["404404", "P-2-1"]]);

    await expect(
      importDescriptionMenacesEspecesFromOdsArrayBuffer(
        fichier,
        especeByCD_REF,
        referentiel.activités,
        referentiel.méthodes,
        referentiel.moyensDePoursuite,
      ),
    ).rejects.toThrow(/404404/);
  });
});
