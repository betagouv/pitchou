import { expect, test, describe } from "vitest";

import {
  parseDossiersQuery,
  readDossiersQuery,
  buildDossiersSearchParams,
  WITHOUT_INSTRUCTEUR,
  type DossiersQuery,
} from "./dossiersList.ts";
import { makeQuery } from "./dossiersTestHelpers.ts";

describe("parseDossiersQuery", () => {
  test("falls back to sensible defaults on an empty URL", () => {
    const query = parseDossiersQuery(new URLSearchParams());

    expect(query).toMatchObject({
      text: "",
      phase: [],
      activite: [],
      prochaineAction: [],
      departement: [],
      instructeur: [],
      nouveaute: "",
      actionInstructeur: false,
      dateField: "deposit",
      sort: "nouveaute",
      order: "desc",
      page: 1,
    });
  });

  test("reads each param", () => {
    const params = new URLSearchParams({
      q: "photovoltaïque",
      activite: "Élevage",
      action: "Instructeur",
      instructeur: "jane@doe.fr",
      nouveaute: "oui",
      actionInstructeur: "1",
      dateField: "phaseStart",
      from: "2024-01-01",
      to: "2024-02-01",
      sort: "name",
      order: "asc",
      page: "3",
    });
    // Multi-valued filters appear once per selected value
    params.append("phase", "Instruction");
    params.append("phase", "Contrôle");
    params.append("departement", "64");
    params.append("departement", "33");

    expect(parseDossiersQuery(params)).toMatchObject({
      text: "photovoltaïque",
      phase: ["Instruction", "Contrôle"],
      activite: ["Élevage"],
      prochaineAction: ["Instructeur"],
      departement: ["64", "33"],
      instructeur: ["jane@doe.fr"],
      nouveaute: "oui",
      actionInstructeur: true,
      dateField: "phaseStart",
      dateStart: "2024-01-01",
      dateEnd: "2024-02-01",
      sort: "name",
      order: "asc",
      page: 3,
    });
  });

  test("rejects invalid enum-like values", () => {
    const params = new URLSearchParams({
      nouveaute: "peut-être",
      dateField: "n-importe-quoi",
      sort: "n-importe-quoi",
      order: "n-importe-quoi",
      page: "-2",
    });
    const query = parseDossiersQuery(params);

    expect(query.nouveaute).toBe("");
    expect(query.dateField).toBe("deposit");
    expect(query.sort).toBe("nouveaute");
    expect(query.order).toBe("desc");
    expect(query.page).toBe(1);
  });
});

describe("readDossiersQuery", () => {
  test("applies the UI default sort (date de dépôt, décroissant) when the URL has none", () => {
    const query = readDossiersQuery(new URLSearchParams());
    expect(query.sort).toBe("depositDate");
    expect(query.order).toBe("desc");
  });

  test("keeps the sort carried by the URL", () => {
    const query = readDossiersQuery(new URLSearchParams({ sort: "name", order: "asc" }));
    expect(query.sort).toBe("name");
    expect(query.order).toBe("asc");
  });
});

describe("buildDossiersSearchParams", () => {
  test("omits defaults, keeping the URL empty for a pristine query", () => {
    expect(buildDossiersSearchParams(readDossiersQuery(new URLSearchParams())).toString()).toBe("");
  });

  test("round-trips every filter through the URL", () => {
    const query = makeQuery({
      text: "photovoltaïque",
      phase: ["Instruction", "Contrôle"],
      activite: ["Élevage"] as unknown as DossiersQuery["activite"],
      prochaineAction: ["Pétitionnaire"],
      departement: ["64", "33"],
      instructeur: [WITHOUT_INSTRUCTEUR, "jane@doe.fr"],
      nouveaute: "oui",
      enjeu: true,
      decisionText: "AP-2024-042",
      decisionAbsente: true,
      avisExpertManquant: true,
      dateField: "phaseStart",
      dateStart: "2024-01-01",
      dateEnd: "2024-02-01",
      sort: "name",
      order: "asc",
      page: 3,
    });
    const params = buildDossiersSearchParams(query);
    expect(readDossiersQuery(params)).toEqual(query);
  });
});
