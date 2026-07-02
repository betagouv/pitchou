import { describe, it, expect } from "vitest";
import { createOdsFile } from "@odfjs/odfjs";
import * as XLSX from "xlsx";

import { importDescriptionMenacesEspècesFromOdsArrayBuffer } from "@pitchou/common/outils-espèces.ts";
import { créerEspècesGroupéesParImpact } from "./créerEspècesGroupéesParImpact.ts";

import type {
  EspèceProtégée,
  ParClassification,
  ActivitéMenançante,
  MéthodeMenançante,
  MoyenDePoursuiteMenaçant,
  ImpactQuantifié,
} from "@pitchou/types/especes.d.ts";

// The "Génération de documents" tab feeds the parsed impacted-espece file into
// créerEspècesGroupéesParImpact. This test proves that step works — and produces
// the same result — whether the petitionnaire uploaded an .ods or an .xlsx.
describe("créerEspècesGroupéesParImpact with an impacted-espece file uploaded as .xlsx", () => {
  const espèce = {
    CD_REF: "2437",
    classification: "oiseau",
    nomsScientifiques: new Set(["Morus bassanus"]),
    nomsVernaculaires: new Set(["Fou de Bassan"]),
    CD_TYPE_STATUTS: new Set(["PN"]),
    espèceCNPN: "O",
    espèceMinistérielle: undefined,
  } as unknown as EspèceProtégée;

  const espèceByCD_REF = new Map([["2437" as EspèceProtégée["CD_REF"], espèce]]);

  const activité: ActivitéMenançante = {
    "Code rapportage européen": "",
    "Identifiant Pitchou": "P-2-1",
    "Libellé activité directive européenne": "",
    "Libellé Pitchou": "Capture pour captivité",
    Méthode: "Non",
    "Moyen de poursuite": "Non",
    "Nombre d'individus": "Oui",
    Nids: "Non",
    Œufs: "Non",
    "Surface habitat détruit (m²)": "Non",
  };

  const activités: ParClassification<Map<string, ActivitéMenançante>> = {
    oiseau: new Map([["P-2-1", activité]]),
    "faune non-oiseau": new Map(),
    flore: new Map(),
  };
  const empty = <T>(): ParClassification<Map<string, T>> => ({
    oiseau: new Map(),
    "faune non-oiseau": new Map(),
    flore: new Map(),
  });
  const méthodes = empty<MéthodeMenançante>();
  const moyensDePoursuite = empty<MoyenDePoursuiteMenaçant>();

  // Mirrors the map chargerActivitésMéthodesMoyensDePoursuite() gives the generation tab.
  const identifiantPitchouVersActivitéEtImpactsQuantifiés = new Map([
    ["P-2-1", { ...activité, impactsQuantifiés: ["Nombre d'individus"] as ImpactQuantifié[] }],
  ]);

  const headers = ["CD_REF", "nombre individus", "identifiant pitchou activité"];
  // CD_REF as a raw number: this is what breaks with a hand-made .xlsx.
  const dataRow: (string | number)[] = [2437, 5, "P-2-1"];

  const buildOds = () =>
    createOdsFile(
      new Map([
        [
          "oiseau",
          [
            headers.map((value) => ({ value, type: "string" as const })),
            dataRow.map((value) =>
              typeof value === "number"
                ? { value, type: "float" as const }
                : { value, type: "string" as const },
            ),
          ],
        ],
      ]),
    );

  const buildXlsx = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, dataRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "oiseau");
    return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  };

  const grouperDepuis = async (fichier: ArrayBuffer) => {
    const description = await importDescriptionMenacesEspècesFromOdsArrayBuffer(
      fichier,
      espèceByCD_REF,
      activités,
      méthodes,
      moyensDePoursuite,
    );
    return créerEspècesGroupéesParImpact(
      description,
      identifiantPitchouVersActivitéEtImpactsQuantifiés,
    );
  };

  it("groups the impacted especes from an .xlsx into the generation balises", async () => {
    const groupes = await grouperDepuis(buildXlsx());

    expect(groupes).toHaveLength(1);
    expect(groupes[0].activité).toBe("Capture pour captivité");
    expect(groupes[0].impactsQuantifiés).toEqual(["Nombre d'individus"]);
    expect(groupes[0].espèces).toHaveLength(1);
    expect(groupes[0].espèces[0]).toMatchObject({
      // Numeric CD_REF from the .xlsx is normalised back to a string.
      CD_REF: "2437",
      nomVernaculaire: "Fou de Bassan",
      nomScientifique: "Morus bassanus",
      espèceCNPN: true,
      espèceMinistérielle: false,
    });
  });

  it("produces the same generation grouping from an .xlsx as from an equivalent .ods", async () => {
    const depuisXlsx = await grouperDepuis(buildXlsx());
    const depuisOds = await grouperDepuis(await buildOds());

    expect(depuisXlsx).toEqual(depuisOds);
  });
});
