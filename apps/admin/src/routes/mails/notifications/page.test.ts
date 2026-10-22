import { beforeEach, expect, test, vi } from "vitest";
import { isAdminEmail } from "@pitchou/server/admin.ts";
import { notificationOverview } from "@pitchou/server/database/notification_monitoring.ts";
import { load } from "./+page.server.ts";
vi.mock("@pitchou/server/admin.ts", () => ({ isAdminEmail: vi.fn() }));
vi.mock("@pitchou/server/database/notification_monitoring.ts", async (original) => ({
  ...(await original<typeof import("@pitchou/server/database/notification_monitoring.ts")>()),
  notificationOverview: vi.fn(),
}));
function event(user: { email: string } | null, search = "") {
  return {
    locals: { user },
    url: new URL(`https://admin.test/mails/notifications${search}`),
  } as never;
}
beforeEach(() => vi.clearAllMocks());
test("requires an authenticated admin before querying any notification identity", async () => {
  await expect(load(event(null))).rejects.toMatchObject({ status: 401 });
  vi.mocked(isAdminEmail).mockReturnValue(false);
  await expect(load(event({ email: "user@test.fr" }))).rejects.toMatchObject({ status: 403 });
  expect(notificationOverview).not.toHaveBeenCalled();
});
test("validates filters for admins and returns read-only results", async () => {
  vi.mocked(isAdminEmail).mockReturnValue(true);
  vi.mocked(notificationOverview).mockResolvedValue({
    rows: [],
    counts: [],
    total: 0,
    history: [],
  });
  await expect(load(event({ email: "admin@test.fr" }, "?page=-1"))).rejects.toMatchObject({
    status: 400,
  });
  expect(notificationOverview).not.toHaveBeenCalled();
  const result = await load(event({ email: "admin@test.fr" }, "?kind=novelty&overdue=1"));
  expect(result).toMatchObject({
    filters: { kind: "novelty", overdue: true },
    overview: { total: 0 },
  });
});
