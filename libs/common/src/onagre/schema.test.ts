import { expect, it } from "vitest";
import { columnDescriptions } from "./schema.ts";
it("retains source column types and comments with SQL quotes", () => {
  const result = columnDescriptions(
    "CREATE TABLE onagre.projet (\n    projetid integer NOT NULL,\n    nomprojet character varying(150)\n);\nCOMMENT ON COLUMN onagre.projet.nomprojet IS 'Nom de l''opération';",
  );
  expect(result.get("projet.projetid")).toBe("integer NOT NULL");
  expect(result.get("projet.nomprojet")).toBe("character varying(150) · Nom de l'opération");
});
