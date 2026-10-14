import { beforeEach, expect, test, vi } from "vitest";
import { GET, POST } from "./+server.ts";
import { emailNotificationPreferencesFromCap } from "@pitchou/server/database/email_notification_preferences.ts";

vi.mock("@pitchou/server/database/email_notification_preferences.ts", () => ({
  emailNotificationPreferencesFromCap: vi.fn(),
}));
const cap = "11111111-1111-4111-8111-111111111111";
function event(body?: unknown, capability = cap) {
  return {
    url: new URL(`http://pitchou.test/parametres/notifications?cap=${capability}`),
    request: new Request("http://pitchou.test/parametres/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  } as unknown as Parameters<typeof POST>[0];
}
beforeEach(() => vi.resetAllMocks());
test("returns and saves only the authenticated person's preferences", async () => {
  vi.mocked(emailNotificationPreferencesFromCap).mockResolvedValue({
    assignment: false,
    novelty: true,
  });
  expect(await (await GET(event())).json()).toEqual({ assignment: false, novelty: true });
  expect(await (await POST(event({ assignment: false, novelty: true }))).json()).toEqual({
    assignment: false,
    novelty: true,
  });
  expect(emailNotificationPreferencesFromCap).toHaveBeenLastCalledWith(cap, {
    assignment: false,
    novelty: true,
  });
});
test.each([
  { assignment: "false", novelty: true },
  { assignment: true },
  { assignment: true, novelty: false, personne: 42 },
])("rejects invalid preferences without writing", async (body) => {
  await expect(POST(event(body))).rejects.toMatchObject({ status: 400 });
  expect(emailNotificationPreferencesFromCap).not.toHaveBeenCalled();
});
test("rejects unknown and malformed capabilities", async () => {
  await expect(GET(event())).rejects.toMatchObject({ status: 403 });
  await expect(POST(event({ assignment: true, novelty: true }, "invalid"))).rejects.toMatchObject({
    status: 403,
  });
});
