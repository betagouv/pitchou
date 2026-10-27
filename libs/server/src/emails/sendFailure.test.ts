import { afterEach, beforeEach, expect, test, vi } from "vitest";
import ky, { NetworkError } from "ky";
vi.mock("./issues.ts", () => ({ reportEmailIssue: vi.fn().mockResolvedValue("processed") }));
vi.mock("../emails.ts", () => ({ isBrevoDuplicateIdempotencyError: vi.fn() }));
import { reportEmailIssue } from "./issues.ts";
import { isBrevoDuplicateIdempotencyError } from "../emails.ts";
import { reportBrevoSendFailure } from "./sendFailure.ts";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isBrevoDuplicateIdempotencyError).mockResolvedValue(false);
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "");
});
afterEach(() => vi.unstubAllEnvs());

test("reports the envelope and error category without leaking message bodies or login tokens", async () => {
  await reportBrevoSendFailure(
    {
      to: [{ email: "recipient@test.fr" }],
      cc: [{ email: "copy@test.fr" }],
      templateId: 30,
      params: { lien_connexion: "https://pitchou.test/?secret=private-token" },
      htmlContent: "private body",
      headers: { idempotencyKey: "notification-id" },
    },
    new Error("private provider error"),
  );
  expect(reportEmailIssue).toHaveBeenCalledWith(
    expect.objectContaining({
      key: "send:notification-id",
      recipient: "recipient@test.fr, copy@test.fr",
      reason: "unknown",
      environment: "pitchou-env-production",
    }),
  );
  expect(JSON.stringify(vi.mocked(reportEmailIssue).mock.calls)).not.toMatch(/private|secret/u);
});

test("Brevo idempotency duplicates do not generate false failure alerts", async () => {
  vi.mocked(isBrevoDuplicateIdempotencyError).mockResolvedValue(true);
  await reportBrevoSendFailure({}, new Error("duplicate"));
  expect(reportEmailIssue).not.toHaveBeenCalled();
});

test("reports actual Ky transport failures as network errors without exposing their cause", async () => {
  const error = await ky
    .post("https://api.brevo.com/v3/smtp/email", {
      retry: 0,
      fetch: vi
        .fn()
        .mockRejectedValue(
          new TypeError("fetch failed", { cause: new Error("private connection details") }),
        ),
    })
    .catch((error: unknown) => error);
  expect(error).toBeInstanceOf(NetworkError);

  await reportBrevoSendFailure(
    { to: [{ email: "recipient@test.fr" }], subject: "Saisine CNPN" },
    error,
  );
  expect(reportEmailIssue).toHaveBeenCalledWith(expect.objectContaining({ reason: "network" }));
  expect(JSON.stringify(vi.mocked(reportEmailIssue).mock.calls)).not.toContain("private");
});
