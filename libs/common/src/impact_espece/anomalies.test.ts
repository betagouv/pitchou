import { expect, test } from "vitest";

import { anomaliesTitle } from "./anomalies.ts";

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
    "Le fichier espèces impactées n’a pas pu être lu",
  );
});

test("says the file is partly unreadable when line and file anomalies are mixed", () => {
  expect(anomaliesTitle([{ ligne: 3, message: "a" }, { message: "lecture interrompue" }])).toBe(
    "Le fichier espèces impactées n’a pas pu être lu entièrement",
  );
});
