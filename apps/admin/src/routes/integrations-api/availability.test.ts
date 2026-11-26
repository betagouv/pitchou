import { afterEach, expect, test, vi } from "vitest";
import { listApiIntegrations } from "@pitchou/server/database/externalApi/integrations.ts";
import { load } from "./+page.server.ts";

vi.mock("@pitchou/server/database/externalApi/integrations.ts", () => ({
  listApiIntegrations: vi.fn(),
}));

const list = vi.mocked(listApiIntegrations);
const event = { setHeaders: vi.fn() } as unknown as Parameters<typeof load>[0];

afterEach(() => list.mockReset());

test.each(["42P01", "42703"])(
  "returns a temporary error while the shared schema is missing (%s)",
  async (code) => {
    list.mockRejectedValue(Object.assign(new Error("Missing relation or column"), { code }));
    await expect(load(event)).rejects.toMatchObject({ status: 503 });
  },
);

test("leaves other database failures visible to the error handler", async () => {
  const failure = new Error("Database offline");
  list.mockRejectedValue(failure);
  await expect(load(event)).rejects.toBe(failure);
});
