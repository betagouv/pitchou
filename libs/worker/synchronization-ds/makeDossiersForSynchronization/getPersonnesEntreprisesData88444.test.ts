import { expect, test } from "vitest";
import { getPersonnesEntreprisesData88444 } from "./getPersonnesEntreprisesData88444.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";

test("physical applicant contact values are stored in the dossier identity, including cleared values", () => {
  const fields = new Map<keyof DossierDemarcheNumerique88444, string>([
    ["Le demandeur est…", "type"],
    ["Numéro de téléphone de contact", "phone"],
    ["Adresse mail de contact", "email"],
    ["Qualification", "role"],
  ]);
  const dossier = {
    demandeur: { nom: "Martin", prenom: "Camille", email: "compte@test.fr" },
    usager: { email: "compte@test.fr" },
    champs: [
      { id: "type", stringValue: "une personne physique" },
      { id: "phone", stringValue: "0102030405" },
      { id: "email", stringValue: "contact@test.fr" },
      { id: "role", stringValue: "Écologue" },
    ],
  } as unknown as DossierDS88444;
  expect(getPersonnesEntreprisesData88444(dossier, fields).identites[0]).toMatchObject({
    type: "demandeur",
    first_names: "Camille",
    last_name: "Martin",
    email: "contact@test.fr",
    phone: "0102030405",
    role: "Écologue",
  });
  dossier.champs = dossier.champs.filter(({ id }) => id !== "phone" && id !== "role");
  expect(getPersonnesEntreprisesData88444(dossier, fields).identites[0]).toMatchObject({
    phone: null,
    role: null,
  });
});
