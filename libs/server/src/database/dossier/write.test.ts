import { expect, it } from "vitest";
import { getDossierInstructionState } from "./write.ts";
import { fakeDatabase } from "../fakeDatabase.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

it("selects the stored next action when reading the instruction state for audit", async () => {
  const before = { next_action_expected: "legacy task" };
  const db = fakeDatabase().selectResolves([before]).build();
  await expect(getDossierInstructionState(42 as DossierId, db.knex)).resolves.toEqual(before);
  expect(db.select).toHaveBeenCalledWith(expect.arrayContaining(["next_action_expected"]));
  expect(db.where).toHaveBeenCalledWith({ id: 42 });
});
