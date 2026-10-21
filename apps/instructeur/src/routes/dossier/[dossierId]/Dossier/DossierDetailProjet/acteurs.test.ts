import { expect, test } from "vitest";
import { acteurBlocks } from "./acteurs.ts";
import type { ActionDossierId } from "@pitchou/types/database/public/ActionDossier.ts";
import type { DossierActeur, Involvement } from "@pitchou/types/dossierActeur.ts";
import type { FieldChange } from "@pitchou/types/notification.ts";

function acteur(involvements: string[], values: Partial<DossierActeur> = {}): DossierActeur {
  return {
    involvements: involvements as Involvement[],
    first_names: "Jean",
    last_name: "Dupont",
    email: null,
    address: null,
    phone: null,
    role: null,
    ...values,
  };
}

function changes(...fields: string[]) {
  return new Map(
    fields.map((field): [string, FieldChange] => [
      field,
      {
        field,
        label: field,
        revisions: [field as ActionDossierId],
        detected_at: new Date(),
        modified_at: null,
      },
    ]),
  );
}

test("one block per acteur, titled by its involvements, the déposant first", () => {
  const blocks = acteurBlocks(
    [
      acteur(["personne_contact"]),
      acteur(["beneficiaire_demarche_numerique", "deposant"]),
      acteur(["mandataire"]),
    ],
    new Map(),
  );
  expect(blocks.map(({ title }) => title)).toEqual([
    "Déposant · Bénéficiaire Démarche Numérique",
    "Mandataire",
    "Personne contact",
  ]);
});

test("name and email are always shown, the other properties only when filled or changed", () => {
  const [block] = acteurBlocks(
    [acteur(["personne_contact"], { phone: "0612345678" })],
    changes("personne_contact.role"),
  );
  expect(block.rows.map(({ label, value }) => [label, value])).toEqual([
    ["Nom", "Dupont"],
    ["Prénom", "Jean"],
    ["Qualité", null],
    ["Adresse électronique", null],
    ["Téléphone", "0612345678"],
  ]);
  expect(block.rows[2].changes.map(({ field }) => field)).toEqual(["personne_contact.role"]);
});

test("a property changed under several involvements keeps one change per involvement", () => {
  const [block] = acteurBlocks(
    [acteur(["beneficiaire_demarche_numerique", "deposant"])],
    changes("beneficiaire_demarche_numerique.last_name", "deposant.last_name"),
  );
  expect(block.rows[0].changes.map(({ field }) => field)).toEqual([
    "deposant.last_name",
    "beneficiaire_demarche_numerique.last_name",
  ]);
});

test("an involvement without acteur anymore keeps a block for its pending changes", () => {
  const blocks = acteurBlocks([acteur(["deposant"])], changes("mandataire.last_name"));
  expect(blocks.map(({ title }) => title)).toEqual(["Déposant", "Mandataire"]);
  expect(blocks[1].rows[0]).toMatchObject({
    value: null,
    changes: [{ field: "mandataire.last_name" }],
  });
});

test("the changes of the porteur involvements are left to the porteur block", () => {
  const blocks = acteurBlocks(
    [acteur(["beneficiaire_demarche_numerique", "deposant"])],
    changes("beneficiaire_demarche_numerique.email", "mandataire.email"),
    ["beneficiaire_demarche_numerique", "mandataire"],
  );
  expect(blocks).toHaveLength(1);
  expect(blocks[0].rows.flatMap(({ changes }) => changes)).toEqual([]);
});

test("an unknown involvement keeps its raw value", () => {
  expect(acteurBlocks([acteur(["architecte"])], new Map())[0].title).toBe("architecte");
});
