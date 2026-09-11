import { expect, it } from "vitest";
import { getDossierInstructionState } from "./write.ts";
import { fakeDatabase } from "../fakeDatabase.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

it("reads the fields needed to audit DDEP and consultation updates", async () => {
  const before = {
    ddep_required: false,
    er_mesures_sufficient: true,
    public_consultation_start_date: new Date("2026-09-01"),
    public_consultation_end_date: null,
  };
  const db = fakeDatabase().selectResolves([before]).build();
  await expect(getDossierInstructionState(42 as DossierId, db.knex)).resolves.toEqual(before);
  expect(db.select).toHaveBeenCalledWith(Object.keys(before));
  expect(db.where).toHaveBeenCalledWith({ id: 42 });
});
