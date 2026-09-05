import { afterEach, beforeEach, vi } from "vitest";
import { sendEmail } from "@pitchou/server/emails.ts";

vi.mock("$app/environment", () => ({ dev: false }));
// Keep the real access checks and persistence, but use the isolated test database.
vi.mock("@pitchou/server/database/connection.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pitchou/server/database/connection.ts")>()),
  directDatabaseConnection: (await import("../../setup/db.ts")).db,
}));
// Never contact Brevo, even if the shell has real credentials.
vi.mock("@pitchou/server/emails.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pitchou/server/emails.ts")>()),
  sendEmail: vi.fn(),
}));

beforeEach(() => {
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "staging");
  vi.stubEnv("SEED_EMAIL", undefined);
  vi.mocked(sendEmail).mockReset().mockResolvedValue({ messageId: "mock-provider-id" });
});

afterEach(() => {
  vi.unstubAllEnvs();
});
