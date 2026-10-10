import { expect, test } from "vitest";
import { formatShareCapital, formatSiret, porteurDeProjetGroups } from "./porteur.ts";
import { companyPropertyLabels } from "@pitchou/types/notification.ts";
import type { PorteurDeProjet } from "@pitchou/types/porteurDeProjet.ts";

test("SIRET and SIREN are split in groups of digits, other values are kept", () => {
  expect(formatSiret("43229623400029")).toBe("432 296 234 00029");
  expect(formatSiret("432296234")).toBe("432 296 234");
  expect(formatSiret("A12")).toBe("A12");
  expect(formatSiret(null)).toBeNull();
});

test("the share capital is shown in euros", () => {
  expect(formatShareCapital("8000")?.replace(/\s/g, " ")).toBe("8 000 €");
  expect(formatShareCapital("inconnu")).toBe("inconnu");
  expect(formatShareCapital(null)).toBeNull();
});

test("a personne morale porteur lists every entreprise column once, with its change key", () => {
  const groups = porteurDeProjetGroups({
    type: "personne_morale",
    siret: "43229623400029",
    admin_status: "Ferme",
  } as PorteurDeProjet);
  const rows = groups.flatMap(({ rows }) => rows);
  expect(groups.map(({ title }) => title)).toEqual(["Identification", "Activité", "Localisation"]);
  expect(rows.map(({ label }) => label).sort()).toEqual(
    Object.values(companyPropertyLabels).sort(),
  );
  expect(rows.find(({ label }) => label === "SIRET")).toMatchObject({
    value: "432 296 234 00029",
    changeKey: "entreprise.siret",
  });
  expect(rows.find(({ label }) => label === "État administratif")).toMatchObject({
    value: "Fermé",
    kind: "status",
  });
  expect(rows.find(({ label }) => label === "Région")?.value).toBeNull();
});

test("a personne physique porteur lists its identity and contact details", () => {
  const groups = porteurDeProjetGroups({
    type: "personne_physique",
    last_name: "Martin",
    first_names: "Camille",
    email: "camille@test.fr",
    phone: null,
    address: "1 rue A",
    role: null,
  });
  expect(groups.map(({ title, rows }) => [title, rows.map(({ label }) => label)])).toEqual([
    ["Identité", ["Nom", "Prénom", "Qualité"]],
    ["Coordonnées", ["Adresse électronique", "Téléphone", "Adresse"]],
  ]);
  expect(groups[1].rows[0]).toMatchObject({ kind: "email", changeKey: "demandeur.email" });
});
