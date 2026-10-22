import { beforeEach, expect, test, vi } from "vitest";
import { GET, POST } from "./+server.ts";
import { emailNotificationPreferencesForUser } from "@pitchou/server/database/email_notification_preferences.ts";

vi.mock("@pitchou/server/database/email_notification_preferences.ts", () => ({
  emailNotificationPreferencesForUser: vi.fn(),
}));
const userId = 7;
function event(body?: unknown, authenticated = true) {
  return {
    locals: { user: authenticated ? { id: userId } : null },
    request: new Request("http://pitchou.test/parametres/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  } as unknown as Parameters<typeof POST>[0];
}
beforeEach(() => vi.resetAllMocks());
test("returns and saves only the authenticated person's preferences", async () => {
  vi.mocked(emailNotificationPreferencesForUser).mockResolvedValue({
    assignment: false,
    novelty: true,
    arrival: true,
  });
  expect(await (await GET(event())).json()).toEqual({
    assignment: false,
    novelty: true,
    arrival: true,
  });
  expect(
    await (await POST(event({ assignment: false, novelty: true, arrival: true }))).json(),
  ).toEqual({
    assignment: false,
    novelty: true,
    arrival: true,
  });
  expect(emailNotificationPreferencesForUser).toHaveBeenLastCalledWith(userId, {
    assignment: false,
    novelty: true,
    arrival: true,
  });
});
test.each([
  { assignment: true, novelty: true },
  { assignment: true, novelty: true, arrival: "false" },
  { assignment: "false", novelty: true, arrival: true },
  { assignment: true },
  { assignment: true, novelty: false, arrival: true, personne: 42 },
])("rejects invalid preferences without writing", async (body) => {
  await expect(POST(event(body))).rejects.toMatchObject({ status: 400 });
  expect(emailNotificationPreferencesForUser).not.toHaveBeenCalled();
});
test("rejects unauthenticated requests and unknown accounts", async () => {
  await expect(GET(event())).rejects.toMatchObject({ status: 403 });
  await expect(
    POST(event({ assignment: true, novelty: true, arrival: true }, false)),
  ).rejects.toMatchObject({
    status: 401,
  });
});
