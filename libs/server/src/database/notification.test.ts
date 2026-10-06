import { afterEach, beforeEach, expect, test, vi } from "vitest";
import knex, { type Knex } from "knex";
import { getNotificationsForUser, updateNotificationDossier } from "./notification.ts";
import { getUserById } from "./personne.ts";
import { dossiersAccessibleToUser } from "./dossier/access.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { AuthUser as Personne } from "@pitchou/types/permissions.ts";
import type { ActionDossierId } from "@pitchou/types/database/public/ActionDossier.ts";

vi.mock("./personne.ts", () => ({ getUserById: vi.fn() }));
vi.mock("./dossier/access.ts", async (original) => ({
  ...(await original<typeof import("./dossier/access.ts")>()),
  dossiersAccessibleToUser: vi.fn(),
}));

const dossier = 1 as DossierId;
const cap = 1 as UserId;
const seenRevision = "00000000-0000-4000-8000-000000000001" as ActionDossierId;
const laterRevision = "00000000-0000-4000-8000-000000000002";
let db: Knex;
let queries: { sql: string; bindings: unknown[] }[];
let pendingActions: object[];
const latestDetectedAt = new Date("2026-09-07T12:00:00Z");

beforeEach(() => {
  vi.mocked(getUserById).mockResolvedValue({ id: 7 } as Personne);
  vi.mocked(dossiersAccessibleToUser).mockResolvedValue(new Map([[dossier, "complet"]]));
  queries = [];
  pendingActions = [
    {
      id: laterRevision,
      dossier,
      author_petitionnaire: true,
      created_at: new Date("2026-09-06"),
      data: { field: "Description", notification: true },
    },
  ];
  db = knex({ client: "pg" });
  vi.spyOn(db.client, "releaseConnection").mockResolvedValue(undefined);
  // Compile and run the real Knex queries, replacing only the driver's response.
  const query = (
    config: { text: string; values?: unknown[] },
    callback: (error: null, response: object) => void,
  ) => {
    const { text: sql, values: bindings = [] } = config;
    queries.push({ sql, bindings });
    let rows: object[] = [];
    if (sql.startsWith('select "access"."dossier"')) rows = [{ dossier }];
    if (sql.startsWith('select "id" from "action_dossier"')) rows = [{ id: seenRevision }];
    if (sql.startsWith('select "a".*')) rows = pendingActions;
    if (sql.startsWith('select "a"."dossier", max('))
      rows = [{ dossier, detected_at: latestDetectedAt }];
    callback(null, { rows, rowCount: rows.length, command: sql.split(" ")[0].toUpperCase() });
  };
  vi.spyOn(db.client, "acquireConnection").mockResolvedValue({ query });
});
afterEach(async () => {
  await db.destroy();
  vi.restoreAllMocks();
});

test("notification reads filter full service access and the current person's acknowledgments", async () => {
  const result = await getNotificationsForUser(cap, db);
  expect(result[0].viewed).toBe(false);
  const actions = queries.find(({ sql }) => sql.startsWith('select "a".*'))!;
  expect(actions.sql).toContain('"edge_groupe_instructeurs__dossier"');
  expect(actions.sql).toContain('"r"."action" = "a"."id"');
  expect(actions.sql).toContain('"r"."personne" = $');
  expect(actions.bindings).toContain(7);
  expect(actions.bindings).toContain(cap);
  expect(actions.sql).toContain('"legacy"."receive_legacy_changes"');
  expect(actions.sql).toContain("notification_legacy");
});

test("sorting uses the latest applicant date even when all fields are acknowledged", async () => {
  pendingActions = [];
  const [result] = await getNotificationsForUser(cap, db);
  expect(result).toMatchObject({ viewed: true, changes: [], updated_at: latestDetectedAt });
  const latest = queries.find(({ sql }) => sql.startsWith('select "a"."dossier", max('))!;
  expect(latest.sql).not.toContain("notification_review");
  expect(latest.sql).not.toContain("receive_legacy_changes");
  expect(latest.sql).toContain("author_petitionnaire");
  expect(latest.sql).toContain("notification'");
});

test("acknowledgment persists the same sorting timestamp rather than clearing it", async () => {
  pendingActions = [];
  const result = await updateNotificationDossier(cap, { dossier, revisions: [seenRevision] }, db);
  expect(result).toMatchObject({ viewed: true, changes: [], updated_at: latestDetectedAt });
  const cache = queries.find(({ sql }) => sql.startsWith('insert into "notification"'))!;
  expect(cache.bindings).toContainEqual(latestDetectedAt);
});

test("acknowledgment validates the supplied action IDs within the dossier, never the latest revision", async () => {
  const result = await updateNotificationDossier(cap, { dossier, revisions: [seenRevision] }, db);
  const selection = queries.find(({ sql }) => sql.startsWith('select "id" from "action_dossier"'))!;
  expect(selection.bindings).toEqual([dossier, true, seenRevision]);
  const insert = queries.find(({ sql }) => sql.startsWith('insert into "notification_review"'))!;
  expect(insert.bindings).toEqual([seenRevision, 7]);
  expect(result.changes[0].revisions).toEqual([laterRevision]);
  expect(result.viewed).toBe(false);
});

test("follow dismissal compares its revision and never updates field acknowledgments", async () => {
  await updateNotificationDossier(cap, { dossier, followRevision: seenRevision }, db);
  const update = queries.find(({ sql }) => sql.startsWith('update "notification"'))!;
  expect(update.sql).toContain('"follow_revision" = $');
  expect(update.bindings).toContain(seenRevision);
  expect(update.bindings).toContain(7);
  expect(queries.some(({ sql }) => sql.startsWith('insert into "notification_review"'))).toBe(
    false,
  );
});

test("read-only access is refused before writing any personal state", async () => {
  vi.mocked(dossiersAccessibleToUser).mockResolvedValue(new Map([[dossier, "lecture"]]));
  await expect(updateNotificationDossier(cap, { dossier, arrival: true }, db)).rejects.toThrow(
    "Accès au dossier refusé",
  );
  expect(queries.some(({ sql }) => /^(insert|update)/.test(sql))).toBe(false);
});
