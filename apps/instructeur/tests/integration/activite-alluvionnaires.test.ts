import { expect, test } from "vitest";
import {
  up,
  down,
} from "../../../../libs/database/migrations/20260906120000_add-carrieres-alluvionnaires-activite.ts";
import { db } from "../setup/db.ts";

const CODE = "carrieres-alluvionnaires";
const LABEL = "Carrières de matériaux alluvionnaires";

test("migrations register alluvial quarries separately from generic quarries", async () => {
  expect(await db("activite").where({ code: CODE }).first()).toEqual({
    code: CODE,
    label: LABEL,
    groupe_code: "activite-economique",
  });
  expect(await db("activite_label").where({ label: LABEL }).first()).toMatchObject({
    activite_code: CODE,
    needs_review: false,
  });
  expect(await db("activite_label").where({ label: "Carrières" }).first()).toMatchObject({
    activite_code: "carrieres",
    needs_review: false,
  });
});

test.each([true, false])(
  "migration handles existing labels with needs_review=%s",
  async (needsReview) => {
    const trx = await db.transaction();
    try {
      await down(trx);
      await trx("activite_label")
        .where({ label: LABEL })
        .update({ activite_code: "autre", needs_review: needsReview });
      const original = await trx("activite_label").where({ label: LABEL }).first();

      await up(trx);

      expect(await trx("activite_label").where({ label: LABEL }).first()).toEqual({
        ...original,
        activite_code: needsReview ? CODE : "autre",
        needs_review: false,
      });
    } finally {
      await trx.rollback();
    }
  },
);

test("rollback preserves canonical labels and aliases for existing dossiers", async () => {
  const trx = await db.transaction();
  try {
    const alias = "Alluvial quarry test alias";
    await trx("activite_label").insert({ label: alias, activite_code: CODE });

    await down(trx);

    expect(await trx("activite").where({ code: CODE }).first()).toBeUndefined();
    const labels = await trx("activite_label").whereIn("label", [LABEL, alias]);
    expect(labels).toHaveLength(2);
    for (const label of labels) {
      expect(label).toMatchObject({ activite_code: "autre", needs_review: true });
    }
  } finally {
    await trx.rollback();
  }
});
