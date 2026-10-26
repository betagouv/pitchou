import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { getDossierFull, getDossiersSummariesForUser } from "@pitchou/server/database/dossier.ts";
import { getDossiersForExport } from "@pitchou/server/database/dossier/export.ts";
import { updateDossierFromAdmin } from "@pitchou/server/database/dossier_admin/update.ts";
import { getDossierDetailForAdmin } from "@pitchou/server/database/dossier_admin/detail.ts";
import { listDossiersForAdmin } from "@pitchou/server/database/dossier_admin/list.ts";
import {
  up,
  down,
} from "../../../../libs/database/migrations/20261026120000_dossier-deposit-dates.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

// Exercise Onagre HTTP validation, storage, read models and audit together.
test.each(["onagre"])(
  "sets and clears a DDEP date on a %s dossier without an initial deposit",
  async (source) => {
    const { cap, dossier, id } = await createInstructeurWithDossier(db, {
      email: "dates@pitchou.test",
    });
    const dossierId = dossier.id as DossierId;
    const userId = id as UserId;
    await db("dossier").where({ id: dossierId }).update({ source, depot_date: null });
    const update = (value: string | null) =>
      fetchAuthenticated(cap, `${INTEGRATION_BASE_URL}/dossier/${dossierId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ddep_depot_date: value }),
      });
    expect((await update("2026-07-15")).status).toBe(200);
    const fetched = await fetchAuthenticated(cap, `${INTEGRATION_BASE_URL}/dossier/${dossierId}`);
    expect(fetched.status).toBe(200);
    expect((await fetched.json()).ddep_depot_date).toBe("2026-07-15");
    const full = await getDossierFull(dossierId, userId, db);
    expect(full?.depot_date).toBeNull();
    expect(JSON.parse(JSON.stringify(full)).ddep_depot_date).toBe("2026-07-15");
    expect(full?.evenementsPhase).toEqual([]);
    const summary = (await getDossiersSummariesForUser(userId, db))[0];
    expect(summary.depot_date).toBeNull();
    expect(summary.phase_start_date).toBeNull();
    const admin = await getDossierDetailForAdmin(dossierId, db);
    expect(JSON.parse(JSON.stringify(admin)).dossier.ddep_depot_date).toBe("2026-07-15");
    const exported = await getDossiersForExport(userId, "service", [dossierId], db);
    expect(exported?.[0].ddep_depot_date).toEqual(new Date(2026, 6, 15));
    expect(exported?.[0].depot_date).toBeNull();
    expect((await update("2026-02-30")).status).toBe(400);
    expect((await update(null)).status).toBe(200);
    const stored = await db("dossier").where({ id: dossierId }).first();
    expect(stored.depot_date).toBeNull();
    expect(stored.ddep_depot_date).toBeNull();
    const actions = await db("action_dossier")
      .where({ dossier: dossierId, type: "champ_modifie" })
      .orderBy("created_at");
    expect(actions).toHaveLength(2);
    expect(actions.map(({ data }) => [data.from, data.to])).toEqual(
      expect.arrayContaining([
        [null, "2026-07-15"],
        ["2026-07-15", null],
      ]),
    );
  },
);

test("unknown deposit dates sort last in either direction", async () => {
  const rows = await db("dossier")
    .insert([
      { source: "onagre", depot_date: null },
      { source: "pitchou", depot_date: "2026-07-15" },
    ])
    .returning("id");
  for (const sortOrder of ["asc", "desc"] as const) {
    const result = await listDossiersForAdmin(
      { page: 1, pageSize: 10, sort: "depot_date", order: sortOrder },
      db,
    );
    expect(result.dossiers.map(({ id }) => id)).toEqual([rows[1].id, rows[0].id]);
  }
});

test("migration keeps existing deposits and refuses a rollback that would require invented dates", async () => {
  await db.transaction(async (trx) => {
    await down(trx);
    const [row] = await trx("dossier")
      .insert({ source: "pitchou", depot_date: "2025-01-15" })
      .returning("id");
    await up(trx);
    const migrated = await trx("dossier").where(row).first();
    expect(migrated.depot_date).toEqual(new Date("2025-01-15"));
    expect(migrated.ddep_depot_date).toBeNull();
    await trx("dossier").where(row).update({ depot_date: null, ddep_depot_date: "2026-07-15" });
    await expect(down(trx)).rejects.toThrow("unknown deposit date");
    expect(await trx.schema.hasColumn("dossier", "ddep_depot_date")).toBe(true);
  });
});

test.each(["pitchou", "demarche_numerique", "gunenv", "import_fichier", "unknown"])(
  "refuses a DDEP date on %s without changing the creation date or other fields",
  async (source) => {
    const owner = await createInstructeurWithDossier(db);
    await db("dossier")
      .where({ id: owner.dossier.id })
      .update({ source, depot_date: "2025-01-15" });
    const response = await fetchAuthenticated(
      owner.cap,
      `${INTEGRATION_BASE_URL}/dossier/${owner.dossier.id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ddep_depot_date: "2026-07-15", enjeu: true }),
      },
    );
    expect(response.status).toBe(400);
    await expect(
      updateDossierFromAdmin(
        owner.dossier.id as DossierId,
        { columns: { ddep_depot_date: new Date(2026, 6, 15) } },
        "dates@pitchou.test",
        db,
      ),
    ).rejects.toThrow("réservée aux dossiers Onagre");
    const row = await db("dossier").where({ id: owner.dossier.id }).first();
    expect(row.ddep_depot_date).toBeNull();
    expect(row.depot_date).toEqual(new Date("2025-01-15"));
    expect(row.enjeu).toBe(false);
    expect(await db("action_dossier").where({ dossier: owner.dossier.id })).toHaveLength(0);
    // The export must not attribute a DDEP day to another source, even for legacy stored values.
    await db("dossier").where({ id: owner.dossier.id }).update({ ddep_depot_date: "2026-07-15" });
    const exported = await getDossiersForExport(
      owner.id as UserId,
      "service",
      [owner.dossier.id as DossierId],
      db,
    );
    expect(exported?.[0].ddep_depot_date).toBeNull();
  },
);
