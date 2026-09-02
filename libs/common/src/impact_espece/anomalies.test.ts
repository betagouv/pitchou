import { expect, test } from "vitest";

import { anomaliesHint, anomaliesTitle } from "./anomalies.ts";

test("counts the lines when every anomaly points at one", () => {
  expect(anomaliesTitle([{ ligne: 3, message: "a" }])).toBe(
    "1 ligne du fichier n’a pas pu être lue",
  );
  expect(
    anomaliesTitle([
      { ligne: 3, message: "a" },
      { ligne: 4, message: "b" },
    ]),
  ).toBe("2 lignes du fichier n’ont pas pu être lues");
});

test("says the whole file is unreadable when no anomaly points at a line", () => {
  expect(anomaliesTitle([{ message: "ce n’est pas un tableur" }])).toBe(
    "Le fichier des impacts sur les espèces n’a pas pu être lu",
  );
});

test("says the file is partly unreadable when line and file anomalies are mixed", () => {
  expect(anomaliesTitle([{ ligne: 3, message: "a" }, { message: "lecture interrompue" }])).toBe(
    "Le fichier espèces impactées n’a pas pu être lu entièrement",
  );
});

test("does not count a ligne whose value alone was ignored: it is displayed with the others", () => {
  expect(
    anomaliesTitle([
      { ligne: 2, message: "espèce inconnue" },
      { ligne: 3, message: "espèce inconnue" },
      { ligne: 4, ligneIgnoree: false, message: "critère non applicable" },
    ]),
  ).toBe("2 lignes du fichier n’ont pas pu être lues");
});

test("speaks of valeurs when no ligne was dropped", () => {
  expect(
    anomaliesTitle([{ ligne: 4, ligneIgnoree: false, message: "critère non applicable" }]),
  ).toBe("1 valeur du fichier n’a pas pu être lue");
});

test("points at the missing lignes only when there are some", () => {
  expect(anomaliesHint([{ ligne: 3, message: "a" }])).toBe("non reprises ci-dessous.");
  // Nothing is missing from the table, so there is nothing to point at.
  expect(anomaliesHint([{ ligne: 4, ligneIgnoree: false, message: "a" }])).toBe("");
});
