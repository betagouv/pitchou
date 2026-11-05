import { afterAll, beforeAll, expect, test } from "vitest";
import {
  getDossiersListPage,
  getDossiersListIds,
  getDossiersListOptions,
} from "@pitchou/server/database/dossier/list.ts";
import { getNotificationsForUser } from "@pitchou/server/database/notification.ts";
import { disposableAccessDatabase } from "../helpers/disposableAccessDatabase.ts";
import { seedList } from "./dossier-list-query/fixture.ts";
import { readDossiersQuery } from "../../src/lib/components/ListDossiers/query.ts";

import { expectedList } from "./dossier-list-query/oracle.ts";
import { searches } from "./dossier-list-query/cases.ts";

let fixture: Awaited<ReturnType<typeof disposableAccessDatabase>>;
let data: Awaited<ReturnType<typeof seedList>>;
beforeAll(async () => {
  fixture = await disposableAccessDatabase();
  data = await seedList(fixture.db);
}, 60_000);
afterAll(async () => {
  if (fixture) await fixture.close();
}, 60_000);

test("long searches retain every unique term and repeated words keep the same results", async () => {
  const params = new URLSearchParams({
    q: Array.from({ length: 65 }, (_, i) => `term${i}`).join(" "),
  });
  const expected = await expectedList(fixture.db, data.user, params, "all");
  expect((await getDossiersListPage(data.user, params, "all", fixture.db)).total).toBe(
    expected.grouped.length,
  );
  expect(await getDossiersListIds(data.user, params, "all", fixture.db)).toEqual(expected.ids);
  const repeated = new URLSearchParams({ q: "Héron ".repeat(70) });
  expect((await getDossiersListPage(data.user, repeated, "all", fixture.db)).total).toBe(1);
});

test.each(searches)("SQL page and export match existing rules for %s", async (search) => {
  const params = new URLSearchParams(search);
  const expected = await expectedList(fixture.db, data.user, params, "all");
  const page = await getDossiersListPage(data.user, params, "all", fixture.db);
  const number = Math.min(
    readDossiersQuery(params).page,
    Math.max(1, Math.ceil(expected.grouped.length / page.pageSize)),
  );
  expect(page).toMatchObject({
    total: expected.grouped.length,
    totalDemandes: expected.ids.length,
    scopeTotal: expected.scopeTotal,
    page: number,
  });
  expect(page.items).toEqual(
    expected.grouped.slice((number - 1) * page.pageSize, number * page.pageSize),
  );
  expect(await getDossiersListIds(data.user, params, "all", fixture.db)).toEqual(expected.ids);
});

test.each([
  "",
  "localisation=france",
  "instructeur=sans-instructeur",
  "q=elise",
  "phase=Instruction",
  "nouveaute=oui",
])("followed scope uses personal follows with %s", async (search) => {
  const params = new URLSearchParams(search);
  const expected = await expectedList(fixture.db, data.user, params, "followed");
  const page = await getDossiersListPage(data.user, params, "followed", fixture.db);
  expect(page.items).toEqual(expected.grouped);
  expect(page.totalDemandes).toBe(expected.ids.length);
  expect(page.scopeTotal).toBe(4);
  expect(await getDossiersListIds(data.user, params, "followed", fixture.db)).toEqual(expected.ids);
});

test("options span the scope and page payloads keep complete visible notifications and follows", async () => {
  const options = await getDossiersListOptions(data.user, "all", fixture.db);
  expect(options.activites.map((a) => a.code)).toContain("autre");
  expect(options.assignedDepartments).toEqual(["24", "33"]);
  expect(
    (await getDossiersListOptions(data.user, "followed", fixture.db)).assignedDepartments,
  ).toEqual(options.assignedDepartments);
  expect(options.instructeurs).toEqual(["colleague@example.org", "élise@example.org"]);
  const page = await getDossiersListPage(
    data.user,
    new URLSearchParams("nouveaute=oui"),
    "all",
    fixture.db,
  );
  const ids = page.items.map((d) => d.id);
  const notifications = await getNotificationsForUser(data.user, fixture.db, ids);
  expect(page.notifications).toEqual(notifications);
  expect(page.notifications.some((n) => n.changes.some((change) => change.revisions.length))).toBe(
    true,
  );
  expect(
    page.followRelations.flatMap(([, followed]) => followed).every((id) => ids.includes(id)),
  ).toBe(true);
});

test("the page SQL limits IDs before summary hydration and retains unknown phase dates", async () => {
  const sql: string[] = [];
  const record = ({ sql: statement }: { sql: string }) => sql.push(statement);
  fixture.db.on("query", record);
  let page;
  try {
    page = await getDossiersListPage(data.user, new URLSearchParams("page=2"), "all", fixture.db);
  } finally {
    fixture.db.off("query", record);
  }
  expect(page.items).toHaveLength(10);
  expect(
    sql.some(
      (statement) =>
        statement.includes("ranked_demandes") && /limit\s+(?:\?|\$\d+)\s+offset/u.test(statement),
    ),
  ).toBe(true);
  const summarySql = sql.find((statement) => statement.includes('as "especesImpacteesCD_REF"'))!;
  expect(summarySql).toMatch(/"dossier"\."id" in \((?:\$\d+|\?)(?:, (?:\$\d+|\?)){9}\)/u);
  const unknown = await getDossiersListPage(
    data.user,
    new URLSearchParams("q=Riviere"),
    "all",
    fixture.db,
  );
  expect(unknown.items[0].phase_start_date).toBeNull();
});

test("calendar filters preserve browser timezone boundaries, DST and UTC date-only due dates", async () => {
  const dates = [
    "2025-03-29T22:59:59.999Z",
    "2025-03-29T23:00:00Z",
    "2025-03-30T21:59:59.999Z",
    "2025-03-30T22:00:00Z",
    "2025-03-31T03:59:59.999Z",
  ];
  for (const [index, date] of dates.entries()) {
    const id = data.dossiers[index + 25].id;
    await fixture
      .db("dossier")
      .where({ id })
      .update({
        name: "Timezone boundary",
        depot_date: new Date(date),
        next_due_date: index % 2 ? "2025-03-30" : "2025-03-31",
      });
    await fixture
      .db("evenement_phase_dossier")
      .insert({ dossier: id, phase: "Instruction", timestamp: new Date(date) });
    await fixture.db("action_dossier").insert({
      dossier: id,
      type: "modified",
      author_petitionnaire: true,
      data: { notification: true, notification_field: "name" },
      created_at: new Date(date),
    });
  }
  const originalTimeZone = process.env.TZ;
  try {
    for (const timeZone of ["UTC", "Europe/Paris", "America/Guadeloupe"]) {
      for (const dateField of ["deposit", "phaseStart", "lastModified", "nextDue"]) {
        const params = new URLSearchParams({
          q: "Timezone boundary",
          from: "2025-03-30",
          to: "2025-03-30",
          dateField,
          timeZone,
        });
        const expected = await expectedList(fixture.db, data.user, params, "all", timeZone);
        const page = await getDossiersListPage(data.user, params, "all", fixture.db);
        if (dateField === "nextDue" && timeZone === "UTC") {
          expect(page.items.map((d) => d.next_due_date?.toISOString())).toEqual([
            "2025-03-30T00:00:00.000Z",
            "2025-03-30T00:00:00.000Z",
          ]);
        }
        expect(
          page.items.map((d) => d.id),
          `${timeZone} ${dateField}`,
        ).toEqual(expected.ids);
        expect(await getDossiersListIds(data.user, params, "all", fixture.db)).toEqual(
          expected.ids,
        );
      }
    }
  } finally {
    if (originalTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimeZone;
  }
});
