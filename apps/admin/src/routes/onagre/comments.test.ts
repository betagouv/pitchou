import { beforeEach, expect, test, vi } from "vitest";
import { error } from "@sveltejs/kit";
const mocks = vi.hoisted(() => ({ access: vi.fn(), save: vi.fn(), trx: {} }));
vi.mock("@pitchou/server/database.ts", () => ({ directDatabaseConnection: {} }));
vi.mock("#lib/server/writeAccess.ts", () => ({ withAdminWriteAccess: mocks.access }));
vi.mock("@pitchou/server/onagre/comments.ts", async (original) => ({
  ...(await original<typeof import("@pitchou/server/onagre/comments.ts")>()),
  saveCommentDecision: mocks.save,
}));
import { actions } from "./+page.server.ts";
import { parseCommentDecision } from "@pitchou/server/onagre/comments.ts";
import { MappingConflict } from "@pitchou/server/onagre/mappings.ts";
const values = {
  group_id: "a".repeat(16),
  review_hash: "b".repeat(64),
  version: "0",
  outcome: "proposed",
  target: "impact_methode",
  classification: "faune non-oiseau",
  code: "0",
  reason: "Only the manual capture described in this group.",
};
function form(patch = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ ...values, ...patch })) data.set(key, value);
  return data;
}
const event = (patch = {}) =>
  ({
    locals: { user: { id: 7 } },
    request: new Request("http://admin.test/onagre?/saveComment", {
      method: "POST",
      body: form(patch),
    }),
  }) as never;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.access.mockImplementation(async (_locals, _permission, callback) =>
    callback(mocks.trx, { id: 7 }),
  );
});
test("comment proposals use the authenticated manage transaction", async () => {
  expect(await actions.saveComment(event())).toEqual({
    message: "Proposition enregistrée. Aucun dossier modifié.",
  });
  expect(mocks.access.mock.calls[0][1]).toBe("admin:onagre:manage");
  expect(mocks.save).toHaveBeenCalledExactlyOnceWith(mocks.trx, 7, { ...values, version: 0 });
});
test("read-only users cannot save proposals", async () => {
  mocks.access.mockImplementation(() => error(403, "Permission insuffisante"));
  await expect(actions.saveComment(event())).rejects.toMatchObject({ status: 403 });
  expect(mocks.save).not.toHaveBeenCalled();
});
test("invalid destinations and missing reasons are rejected before a write", async () => {
  for (const patch of [
    { target: "dossier" },
    { classification: "unknown" },
    { code: "" },
    { reason: " " },
    { version: "" },
  ])
    expect(await actions.saveComment(event(patch))).toMatchObject({ status: 400 });
  expect(mocks.save).not.toHaveBeenCalled();
});
test("stale proposals return a conflict and non-mapping decisions clear stale targets", async () => {
  mocks.save.mockRejectedValue(new MappingConflict("Rechargez la page."));
  expect(await actions.saveComment(event())).toMatchObject({ status: 409 });
  expect(parseCommentDecision(form({ outcome: "keep_comment" }))).toMatchObject({
    target: null,
    classification: null,
    code: null,
  });
});
