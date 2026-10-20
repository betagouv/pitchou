import { afterEach, expect, test, vi } from "vitest";
import { importDescriptionMenacesEspecesFromURL } from "./importUrl.ts";
import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";
import type { ReferentielMaps } from "./types.ts";

const espece: EspeceProtegee = {
  CD_REF: "2437",
  classification: "oiseau",
  nomsScientifiques: new Set(["Morus bassanus"]),
  nomsVernaculaires: new Set(["Fou de Bassan"]),
  CD_TYPE_STATUTS: new Set(["PN"]),
  espèceCNPN: undefined,
  espèceMinistérielle: undefined,
};
const activites: ReferentielMaps["activites"] = {
  oiseau: new Map(),
  "faune non-oiseau": new Map(),
  flore: new Map(),
};
const methodes: ReferentielMaps["methodes"] = {
  oiseau: new Map(),
  "faune non-oiseau": new Map(),
  flore: new Map(),
};
const moyens: ReferentielMaps["moyens"] = {
  oiseau: new Map(),
  "faune non-oiseau": new Map(),
  flore: new Map(),
};

function importRow(row: Record<string, unknown>) {
  const url = new URL("https://pitchou.test/especes");
  const data = [{ classification: "oiseau", etresVivantsAtteints: [row] }];
  url.searchParams.set("data", Buffer.from(JSON.stringify(data)).toString("base64"));
  return importDescriptionMenacesEspecesFromURL(
    url,
    new Map([[espece.CD_REF, espece]]),
    activites,
    methodes,
    moyens,
  );
}

afterEach(() => vi.restoreAllMocks());

test.each(["espèce", "espece"])("imports the %s field without optional impact codes", (field) => {
  const result = importRow({ [field]: "2437", nombreIndividus: "2" });
  expect(result?.oiseau).toEqual([
    {
      espèce: espece,
      nombreIndividus: "2",
      activité: undefined,
      méthode: undefined,
      moyenDePoursuite: undefined,
    },
  ]);
});

test("rejects an unknown species instead of returning an incomplete impact", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(importRow({ espèce: "unknown" })).toBeUndefined();
  expect(log).toHaveBeenCalledWith(
    "Parsing error",
    expect.objectContaining({ message: "Espèce inconnue: unknown" }),
    expect.any(String),
  );
});
