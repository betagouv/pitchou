import {
  changeAssignments,
  changeDossierAccess,
  lockDossierAccess,
  recalculateAssignments,
} from "@pitchou/server/dossierRouting.ts";
import type { GroupPreview } from "@pitchou/types/groupRouting.ts";
import { expect, test } from "vitest";
import { createDossier, createGroupeInstructeurs } from "../factories/index.ts";
import { admin } from "../helpers/administration.ts";
import { pageQuery, postPreview as post } from "../helpers/routingPreview.ts";
import { db } from "../setup/db.ts";

const input = { name: "Validation", active: true, members: [], rules: [] };
const token = "a".repeat(64);

test.each([
  `?category=added&page=0&token=${token}`,
  `?category=added&page=-1&token=${token}`,
  `?category=added&page=1.5&token=${token}`,
  `?category=added&page=1e2&token=${token}`,
  `?category=added&page=01&token=${token}`,
  `?category=added&page=%2B1&token=${token}`,
  `?category=added&page=%201&token=${token}`,
  `?category=added&page=Infinity&token=${token}`,
  `?category=added&page=9007199254740993&token=${token}`,
  `?category=added&page=85899347&token=${token}`,
  `?category=other&page=1&token=${token}`,
  `?category=added&page=&token=${token}`,
  "?category=added&page=1",
  `?category=added&token=${token}`,
  `?page=1&token=${token}`,
  "?category=added&page=1&token=invalid",
  `?category=added&category=removed&page=1&token=${token}`,
  `?category=added&page=1&page=2&token=${token}`,
  `?category=added&page=1&token=${token}&token=${token}`,
  `?category=added&page=1&token=${token}&unknown=1`,
])("invalid preview pagination is rejected before running dossier queries: %s", async (query) => {
  const actor = await admin();
  expect((await post(actor.token, input, query)).status).toBe(400);
  expect(await db("groupe_instructeurs")).toHaveLength(0);
  expect(await db("administration_event")).toHaveLength(0);
});

test.each(["admin:access", "groups:manage"])(
  "paginated previews require %s",
  async (permission) => {
    const actor = await admin();
    await changeDossierAccess(db, (routingTrx) =>
      routingTrx("auth_permission_exclusion").insert({ user_id: actor.id, permission }),
    );
    expect((await post(actor.token, input, pageQuery(token, "added", 1))).status).toBe(403);
    expect(await db("administration_event")).toHaveLength(0);
  },
);

test("empty categories have one empty page and manual access survives empty rules", async () => {
  const actor = await admin();
  const group = await createGroupeInstructeurs(db);
  const manual = await createDossier(db, { primary_department: "75" });
  await changeAssignments(db, (routingTrx) =>
    routingTrx("dossier_group_override").insert({
      groupe_instructeurs: group.id,
      dossier: manual.id,
      mode: "include",
      access_level: "read",
    }),
  );
  const proposal = { ...input, id: group.id };
  const preview: GroupPreview = await (await post(actor.token, proposal)).json();
  for (const category of ["added", "removed", "upgraded", "downgraded"] as const) {
    expect(preview[category]).toEqual({ count: 0, dossiers: [] });
    const result = await post(actor.token, proposal, pageQuery(preview.token, category, 1));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({
      token: preview.token,
      count: 0,
      dossiers: [],
      page: 1,
      pageSize: 25,
    });
    expect((await post(actor.token, proposal, pageQuery(preview.token, category, 2))).status).toBe(
      400,
    );
  }
  const inactive: GroupPreview = await (
    await post(actor.token, { ...proposal, active: false })
  ).json();
  expect(inactive.removed).toEqual({ count: 1, dossiers: [{ id: manual.id, name: manual.name }] });
});

test("queued page requests recheck administrator permission after acquiring the advisory lock", async () => {
  const actor = await admin();
  const preview: GroupPreview = await (await post(actor.token, input)).json();
  const revocation = await db.transaction();
  await lockDossierAccess(revocation);
  let request: Promise<Response> | undefined;
  try {
    const {
      rows: [{ pid }],
    } = await revocation.raw("select pg_backend_pid() as pid");
    await revocation("auth_permission_bundle").where({ user_id: actor.id }).delete();
    request = post(actor.token, input, pageQuery(preview.token, "added", 1));
    await expect
      .poll(
        async () => {
          const { rows } = await db.raw(
            "select pid from pg_stat_activity where datname = current_database() and ? = any(pg_blocking_pids(pid)) and query like '%pg_advisory_xact_lock%'",
            [pid],
          );
          return rows.length;
        },
        { timeout: 5000 },
      )
      .toBe(1);
    await recalculateAssignments(revocation, { silent: true });
    await revocation.commit();
    expect((await request).status).toBe(400);
    expect(await db("administration_event")).toHaveLength(0);
    expect(await db("groupe_instructeurs")).toHaveLength(0);
  } finally {
    if (!revocation.isCompleted()) await revocation.rollback();
    await request;
  }
});
