import { expect, test, describe } from "vitest";

import {
  parseDossiersQuery,
  readDossiersQuery,
  buildDossiersSearchParams,
  WITHOUT_INSTRUCTEUR,
} from "./listModel.ts";
import { makeQuery } from "./testHelpers.ts";

describe("parseDossiersQuery", () => {
  test("falls back to sensible defaults on an empty URL", () => {
    const query = parseDossiersQuery(new URLSearchParams());

    expect(query).toMatchObject({
      text: "",
      phase: [],
      activite: [],
      espece: [],
      prochaineAction: [],
      departement: [],
      instructeur: [],
      nouveaute: "",
      actionInstructeur: false,
      dateField: "deposit",
      sort: "depositDate",
      order: "desc",
      page: 1,
      pageSize: 10,
    });
  });

  test("reads each param", () => {
    const params = new URLSearchParams({
      q: "photovoltaïque",
      activite: "carrieres",
      action: "Instructeur",
      instructeur: "jane@doe.fr",
      nouveaute: "oui",
      actionInstructeur: "1",
      dateField: "phaseStart",
      from: "2024-01-01",
      to: "2024-02-01",
      sort: "lastModified",
      order: "asc",
      page: "3",
      pageSize: "25",
    });
    // Multi-valued filters appear once per selected value
    params.append("phase", "Instruction");
    params.append("phase", "Contrôle");
    params.append("departement", "64");
    params.append("departement", "33");
    params.append("espece", "60630");
    params.append("espece", "2938");

    expect(parseDossiersQuery(params)).toMatchObject({
      text: "photovoltaïque",
      phase: ["Instruction", "Contrôle"],
      activite: ["carrieres"],
      prochaineAction: ["Instructeur"],
      departement: ["64", "33"],
      espece: ["60630", "2938"],
      instructeur: ["jane@doe.fr"],
      nouveaute: "oui",
      actionInstructeur: true,
      dateField: "phaseStart",
      dateStart: "2024-01-01",
      dateEnd: "2024-02-01",
      sort: "lastModified",
      order: "asc",
      page: 3,
      pageSize: 25,
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
    expect(query.sort).toBe("depositDate");
    expect(query.order).toBe("desc");
    expect(query.page).toBe(1);
  });

  test.each(["", "0", "-10", "12", "25.5", "1000", "all", "NaN"])(
    "falls back to 10 dossiers for invalid page size %s",
    (pageSize) => {
      expect(parseDossiersQuery(new URLSearchParams({ pageSize })).pageSize).toBe(10);
    },
  );

  test.each([10, 25, 50, 100])("round-trips page size %i", (pageSize) => {
    const params = buildDossiersSearchParams(makeQuery({ pageSize, page: 2 }));
    expect(params.get("pageSize")).toBe(pageSize === 10 ? null : String(pageSize));
    expect(readDossiersQuery(params)).toMatchObject({ pageSize, page: 2 });
  });
});

describe("readDossiersQuery", () => {
  test("applies the UI default sort (date de dépôt, décroissant) when the URL has none", () => {
    const query = readDossiersQuery(new URLSearchParams());
    expect(query.sort).toBe("depositDate");
    expect(query.order).toBe("desc");
  });

  test("keeps the sort carried by the URL", () => {
    const query = readDossiersQuery(new URLSearchParams({ sort: "lastModified", order: "asc" }));
    expect(query.sort).toBe("lastModified");
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
      activite: ["carrieres"],
      prochaineAction: ["Pétitionnaire"],
      departement: ["64", "33"],
      departementSelection: "custom",
      espece: ["60630", "2938"],
      instructeur: [WITHOUT_INSTRUCTEUR, "jane@doe.fr"],
      nouveaute: "oui",
      enjeu: true,
      decisionText: "AP-2024-042",
      decisionAbsente: true,
      avisExpertManquant: true,
      especesImpacteesAbsente: true,
      dateField: "phaseStart",
      dateStart: "2024-01-01",
      dateEnd: "2024-02-01",
      sort: "lastModified",
      order: "asc",
      page: 3,
      pageSize: 50,
    });
    const params = buildDossiersSearchParams(query);
    expect(readDossiersQuery(params)).toEqual(query);
  });
});
