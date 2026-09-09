import { expect, test } from "vitest";
import { prochaineActionAttenduePar } from "@pitchou/common/phases.ts";
import { nextActionOptions } from "./nextAction.ts";

test("offers the six entities without task choices or groups", () => {
  expect(nextActionOptions).toEqual([
    { value: "", label: "Non renseignée" },
    { value: "Instructeur", label: "Instructeur-ice (Moi)" },
    { value: "CNPN/CSRPN", label: "CNPN/CSRPN" },
    { value: "Pétitionnaire", label: "Pétitionnaire" },
    { value: "Consultation du public", label: "Consultation du public" },
    { value: "Préfet-e", label: "Préfet-e" },
    { value: "Tierce personne/administration", label: "Tierce personne/administration" },
  ]);
  expect(nextActionOptions.slice(1).map(({ value }) => value)).toEqual([
    ...prochaineActionAttenduePar,
  ]);
});
