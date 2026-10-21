import { expect, test } from "vitest";
import { actionsFromActeursChanges, type ActeurValues } from "./history.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

const dossier = 1 as DossierId;

function changes(before: ActeurValues[], after: ActeurValues[]) {
  return actionsFromActeursChanges(dossier, before, after).map(
    ({ data }) => data as Record<string, unknown>,
  );
}

test("an acteur added to a dossier is a revision of each of its filled properties", () => {
  expect(
    changes([], [{ involvement: "personne_contact", personne: { email: "contact@test.fr" } }]),
  ).toEqual([
    {
      field: "Personne contact : Adresse électronique",
      label: "Personne contact : Adresse électronique",
      notification_field: "personne_contact.email",
      from: null,
      to: "contact@test.fr",
      notification: true,
    },
  ]);
});

test("only the changed properties are revisions, with their before and after values", () => {
  const before = {
    first_names: "Camille",
    last_name: "Martin",
    email: "avant@test.fr",
    role: "Gérante",
  };
  const after = { ...before, email: "apres@test.fr", role: null };
  expect(
    changes(
      [{ involvement: "mandataire", personne: before }],
      [{ involvement: "mandataire", personne: after }],
    ),
  ).toMatchObject([
    { notification_field: "mandataire.email", from: "avant@test.fr", to: "apres@test.fr" },
    { notification_field: "mandataire.role", from: "Gérante", to: null },
  ]);
});

test("a déposant replaced by the mandataire is a revision of the déposant", () => {
  const beneficiaire = { last_name: "Martin" };
  const mandataire = { last_name: "Dupont" };
  expect(
    changes(
      [
        { involvement: "beneficiaire_demarche_numerique", personne: beneficiaire },
        { involvement: "deposant", personne: beneficiaire },
      ],
      [
        { involvement: "beneficiaire_demarche_numerique", personne: beneficiaire },
        { involvement: "mandataire", personne: mandataire },
        { involvement: "deposant", personne: mandataire },
      ],
    ).map(({ notification_field, from, to }) => ({ notification_field, from, to })),
  ).toEqual([
    { notification_field: "deposant.last_name", from: "Martin", to: "Dupont" },
    { notification_field: "mandataire.last_name", from: null, to: "Dupont" },
  ]);
});

test("a baseline is kept without notification", () => {
  expect(
    actionsFromActeursChanges(
      dossier,
      [],
      [{ involvement: "deposant", personne: { last_name: "Martin" } }],
      true,
    ).map(({ data }) => data),
  ).toMatchObject([{ notification_field: "deposant.last_name", baseline: true }]);
  expect(
    actionsFromActeursChanges(
      dossier,
      [],
      [{ involvement: "deposant", personne: { last_name: "Martin" } }],
      true,
    )[0].data,
  ).not.toHaveProperty("notification");
});

test("unchanged acteurs and unknown involvements are no revision", () => {
  const acteurs = [
    { involvement: "deposant", personne: { last_name: "Martin" } },
    { involvement: "autre", personne: { last_name: "Durand" } },
  ];
  expect(changes(acteurs, [acteurs[0]])).toEqual([]);
});
