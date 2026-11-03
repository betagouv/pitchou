import { changeAssignments } from "@pitchou/server/dossierRouting.ts";
import type {
  GroupPreview,
  GroupPreviewPage,
  PreviewCategory,
} from "@pitchou/types/groupRouting.ts";
import { expect, test } from "vitest";
import { createGroupeInstructeurs } from "../factories/index.ts";
import { admin, saveGroup } from "../helpers/administration.ts";
import {
  pageQuery,
  postPreview as post,
  previewRule as rule,
  previewState as state,
} from "../helpers/routingPreview.ts";
import { db } from "../setup/db.ts";

test("all four categories paginate beyond 100 with exact counts and no preview writes", async () => {
  const actor = await admin();
  const group = await createGroupeInstructeurs(db);
  const categories = { added: "75", removed: "13", upgraded: "69", downgraded: "21" } as const;
  const dossiers = await changeAssignments(db, (routingTrx) =>
    routingTrx("dossier")
      .insert(
        Object.entries(categories).flatMap(([category, department]) =>
          Array.from({ length: 107 }, (_, index) => ({
            name: index === 106 ? null : `${category} ${107 - index}`,
            primary_department: department,
            source: "demarche_numerique",
            demarche_number: 88444,
          })),
        ),
      )
      .returning(["id", "name", "primary_department"]),
  );
  const input = {
    id: group.id,
    name: "Pages",
    active: true,
    members: [],
    rules: [rule("13"), rule("69", "read"), rule("21")],
  };
  expect((await saveGroup(actor.token, input)).status).toBe(200);
  const proposal = { ...input, rules: [rule("75"), rule("69"), rule("21", "read")] };
  const before = await state();
  const initial = await post(actor.token, proposal);
  expect(initial.status).toBe(200);
  const preview: GroupPreview = await initial.json();
  for (const category of Object.keys(categories) as PreviewCategory[]) {
    const expected = dossiers
      .filter((d) => d.primary_department === categories[category])
      .sort((a, b) => a.id - b.id)
      .map(({ id, name }) => ({ id, name }));
    expect(preview[category]).toEqual({ count: 107, dossiers: expected.slice(0, 25) });
    const combined = [...preview[category].dossiers];
    for (let page = 2; page <= 5; page++) {
      const response = await post(actor.token, proposal, pageQuery(preview.token, category, page));
      expect(response.status).toBe(200);
      const result: GroupPreviewPage = await response.json();
      expect(result).toEqual({
        token: preview.token,
        count: 107,
        dossiers: expected.slice((page - 1) * 25, page * 25),
        page,
        pageSize: 25,
      });
      combined.push(...result.dossiers);
    }
    expect(combined).toEqual(expected);
    expect((await post(actor.token, proposal, pageQuery(preview.token, category, 6))).status).toBe(
      400,
    );
  }
  expect(await state()).toEqual(before);
  expect((await saveGroup(actor.token, { ...proposal, previewToken: preview.token })).status).toBe(
    200,
  );
});

test("a changed dossier beyond page one invalidates pages and saving without partial results", async () => {
  const actor = await admin();
  const dossiers = await changeAssignments(db, (routingTrx) =>
    routingTrx("dossier")
      .insert(
        Array.from({ length: 106 }, (_, index) => ({
          name: `Dossier ${index}`,
          primary_department: "75",
          source: "demarche_numerique",
          demarche_number: 88444,
        })),
      )
      .returning("id"),
  );
  const input = { name: "Stale", active: true, members: [], rules: [rule("75")] };
  const preview: GroupPreview = await (await post(actor.token, input)).json();
  await db("dossier").where({ id: dossiers[105].id }).update({ name: "Changed outside page one" });
  const before = await state();
  const stale = await post(actor.token, input, pageQuery(preview.token, "added", 2));
  expect(stale.status).toBe(409);
  expect(await stale.json()).toMatchObject({ message: expect.stringContaining("Actualisez") });
  expect((await saveGroup(actor.token, { ...input, previewToken: preview.token })).status).toBe(
    400,
  );
  expect(await state()).toEqual(before);
  const fresh: GroupPreview = await (await post(actor.token, input)).json();
  expect(fresh.added).toEqual(preview.added);
  expect(fresh.token).not.toBe(preview.token);
});

test("the token includes unchanged assignments beyond page one and current group state", async () => {
  const actor = await admin();
  const group = await createGroupeInstructeurs(db);
  const dossiers = await changeAssignments(db, (routingTrx) =>
    routingTrx("dossier")
      .insert(
        Array.from({ length: 106 }, () => ({
          primary_department: "75",
          source: "demarche_numerique",
          demarche_number: 88444,
        })),
      )
      .returning("id"),
  );
  const input = { id: group.id, name: "Unchanged", active: true, members: [], rules: [rule("75")] };
  expect((await saveGroup(actor.token, input)).status).toBe(200);
  let preview: GroupPreview = await (await post(actor.token, input)).json();
  expect(
    preview.added.count + preview.removed.count + preview.upgraded.count + preview.downgraded.count,
  ).toBe(0);
  for (const change of [
    () =>
      db("dossier")
        .where({ id: dossiers[105].id })
        .update({ name: "Renamed unchanged assignment" }),
    () =>
      db("dossier_group_override").insert({
        groupe_instructeurs: group.id,
        dossier: dossiers[105].id,
        mode: "include",
        access_level: "read",
      }),
    () => db("user_groupe").insert({ groupe_instructeurs: group.id, user_id: actor.id }),
    () =>
      db("groupe_instructeurs").where({ id: group.id }).update({ name: "Renamed current group" }),
    () =>
      db("group_routing_rule").insert({
        groupe_instructeurs: group.id,
        departments: ["75"],
        communes: [],
        activites: [],
        access_level: "read",
      }),
  ]) {
    await change();
    expect((await post(actor.token, input, pageQuery(preview.token, "added", 1))).status).toBe(409);
    expect((await saveGroup(actor.token, { ...input, previewToken: preview.token })).status).toBe(
      400,
    );
    preview = await (await post(actor.token, input)).json();
  }
});
