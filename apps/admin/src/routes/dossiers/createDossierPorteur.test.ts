import { describe, expect, test } from "vitest";

import { emptyPorteurForm, porteurFormErrors, porteurPayload } from "./createDossierPorteur.ts";

describe("porteurFormErrors", () => {
  test("requires a porteur type", () => {
    expect(Object.keys(porteurFormErrors(emptyPorteurForm()))).toEqual(["type"]);
  });

  test("requires the last and first names of a personne physique", () => {
    const form = { ...emptyPorteurForm(), type: "personne_physique" as const, firstNames: " " };
    expect(Object.keys(porteurFormErrors(form))).toEqual(["lastName", "firstNames"]);
    expect(porteurFormErrors({ ...form, lastName: "Martin", firstNames: "Camille" })).toEqual({});
  });

  test("requires a 14 digits SIRET for a personne morale", () => {
    const form = { ...emptyPorteurForm(), type: "personne_morale" as const };
    expect(porteurFormErrors(form).siret).toBe("Renseignez le numéro de SIRET.");
    expect(porteurFormErrors({ ...form, siret: "1234" }).siret).toBe(
      "Le numéro de SIRET doit contenir 14 chiffres.",
    );
    expect(porteurFormErrors({ ...form, siret: "432 296 234 00029" })).toEqual({});
  });
});

test("the payload only carries the fields of the chosen type", () => {
  const form = {
    type: "personne_morale" as const,
    lastName: "x",
    firstNames: "y",
    siret: "432 296 234 00029",
  };
  expect(porteurPayload(form)).toEqual({ type: "personne_morale", siret: "43229623400029" });
  expect(porteurPayload({ ...form, type: "personne_physique", lastName: " Martin " })).toEqual({
    type: "personne_physique",
    last_name: "Martin",
    first_names: "y",
  });
});
